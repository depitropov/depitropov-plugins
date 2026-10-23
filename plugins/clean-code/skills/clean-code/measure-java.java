// measure-java.java — method shape for Java sources.
//
// Called by measure.py; run by hand only when debugging:
//   java measure-java.java <file>...
// Prints one JSON array of {file, name, line, lines, cc, params, depth}.
//
// The JDK runs this file from source (JDK 17 or newer), and the parser is the
// JDK's own javac tree API, the one crap4java uses: no download, no build. The
// files are parsed only; nothing is compiled, so imports need not resolve.

import com.sun.source.tree.AnnotationTree;
import com.sun.source.tree.BinaryTree;
import com.sun.source.tree.CaseTree;
import com.sun.source.tree.CatchTree;
import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.ConditionalExpressionTree;
import com.sun.source.tree.DoWhileLoopTree;
import com.sun.source.tree.EnhancedForLoopTree;
import com.sun.source.tree.ForLoopTree;
import com.sun.source.tree.IfTree;
import com.sun.source.tree.LambdaExpressionTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.SwitchExpressionTree;
import com.sun.source.tree.SwitchTree;
import com.sun.source.tree.SynchronizedTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.TryTree;
import com.sun.source.tree.VariableTree;
import com.sun.source.tree.WhileLoopTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.SourcePositions;
import com.sun.source.util.TreeScanner;
import com.sun.source.util.Trees;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

public class MeasureJava {

  record Row(String file, String name, long line, long lines, int cc, int params, int depth) {}

  public static void main(String[] args) throws IOException {
    if (args.length == 0) {
      System.err.println("usage: java measure-java.java <file>...");
      System.exit(2);
    }
    JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
    if (compiler == null) {
      System.err.println("this Java runtime has no compiler (a JRE, not a JDK); install a JDK 17 or newer");
      System.exit(2);
    }
    List<Row> rows = new ArrayList<>();
    for (String file : args) {
      rows.addAll(measureFile(compiler, file));
    }
    System.out.print(toJson(rows));
  }

  // One parse per file, so a parse error names its own file and stops the run:
  // measuring what error recovery invented would be a lie.
  static List<Row> measureFile(JavaCompiler compiler, String file) throws IOException {
    DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
    try (StandardJavaFileManager files = compiler.getStandardFileManager(diagnostics, Locale.ROOT, StandardCharsets.UTF_8)) {
      Iterable<? extends JavaFileObject> sources = files.getJavaFileObjectsFromFiles(List.of(new File(file)));
      JavacTask task = (JavacTask) compiler.getTask(null, files, diagnostics, List.of("-proc:none"), null, sources);
      Iterable<? extends CompilationUnitTree> units = task.parse();
      for (Diagnostic<? extends JavaFileObject> d : diagnostics.getDiagnostics()) {
        if (d.getKind() == Diagnostic.Kind.ERROR) {
          System.err.println(file + ":" + d.getLineNumber() + ": " + d.getMessage(Locale.ROOT));
          System.exit(2);
        }
      }
      SourcePositions positions = Trees.instance(task).getSourcePositions();
      List<Row> rows = new ArrayList<>();
      for (CompilationUnitTree unit : units) {
        new Finder(file, unit, positions, rows).scan(unit, null);
      }
      return rows;
    }
  }

  // Finds every measured unit: a method or constructor with a body, and a lambda
  // that initializes a field. A lambda inside a method belongs to that method,
  // like a callback in measure-ts.mjs. A class inside a method is measured on
  // its own, method by method.
  static final class Finder extends TreeScanner<Void, Void> {
    private final String file;
    private final CompilationUnitTree unit;
    private final SourcePositions positions;
    private final List<Row> rows;
    private final Deque<String> owners = new ArrayDeque<>();
    private final CharSequence text;

    Finder(String file, CompilationUnitTree unit, SourcePositions positions, List<Row> rows) throws IOException {
      this.file = file;
      this.unit = unit;
      this.positions = positions;
      this.rows = rows;
      this.text = unit.getSourceFile().getCharContent(true);
    }

    @Override
    public Void visitClass(ClassTree node, Void unused) {
      String name = node.getSimpleName().toString();
      owners.addLast(name.isEmpty() ? "<anonymous>" : name);
      for (Tree member : node.getMembers()) {
        if (member instanceof VariableTree field && field.getInitializer() instanceof LambdaExpressionTree lambda) {
          add(qualified(field.getName().toString()), lambda, start(lambda), lambda.getParameters().size());
        }
      }
      super.visitClass(node, unused);
      owners.removeLast();
      return null;
    }

    @Override
    public Void visitMethod(MethodTree node, Void unused) {
      if (node.getBody() != null) {
        add(qualified(node.getName().toString()), node, signatureStart(node), node.getParameters().size());
      }
      return super.visitMethod(node, unused);
    }

    private void add(String name, Tree unitTree, long start, int params) {
      long end = positions.getEndPosition(unit, unitTree) - 1;
      long first = line(start);
      Shape shape = new Shape();
      shape.scan(unitTree instanceof MethodTree m ? m.getBody() : ((LambdaExpressionTree) unitTree).getBody(), 0);
      rows.add(new Row(file, name, first, line(end) - first + 1, shape.cc, params, shape.maxDepth));
    }

    private String qualified(String name) {
      return String.join(".", owners) + "." + name;
    }

    private long start(Tree tree) {
      return positions.getStartPosition(unit, tree);
    }

    // Annotations are not part of the method's length, like a Python decorator:
    // the method starts at the first character after its last annotation.
    private long signatureStart(MethodTree node) {
      List<? extends AnnotationTree> annotations = node.getModifiers().getAnnotations();
      if (annotations.isEmpty()) {
        return start(node);
      }
      int at = (int) positions.getEndPosition(unit, annotations.get(annotations.size() - 1));
      while (at < text.length() && Character.isWhitespace(text.charAt(at))) {
        at++;
      }
      return at;
    }

    private long line(long position) {
      return unit.getLineMap().getLineNumber(position);
    }
  }

  // Complexity and nesting depth of one body. The definitions follow measure.py:
  // complexity is 1 plus each if, loop, catch, case (not default), conditional
  // expression, && and ||; depth adds one per nested if, loop, try, switch or
  // synchronized block, and an else-if stays on the level of its if.
  static final class Shape extends TreeScanner<Void, Integer> {
    int cc = 1;
    int maxDepth = 0;

    private Void block(Tree node, Integer depth, Runnable more) {
      maxDepth = Math.max(maxDepth, depth + 1);
      more.run();
      return null;
    }

    @Override
    public Void visitClass(ClassTree node, Integer depth) {
      return null;
    }

    @Override
    public Void visitIf(IfTree node, Integer depth) {
      cc++;
      maxDepth = Math.max(maxDepth, depth + 1);
      scan(node.getCondition(), depth + 1);
      scan(node.getThenStatement(), depth + 1);
      Tree otherwise = node.getElseStatement();
      scan(otherwise, otherwise instanceof IfTree ? depth : depth + 1);
      return null;
    }

    @Override
    public Void visitForLoop(ForLoopTree node, Integer depth) {
      cc++;
      return block(node, depth, () -> super.visitForLoop(node, depth + 1));
    }

    @Override
    public Void visitEnhancedForLoop(EnhancedForLoopTree node, Integer depth) {
      cc++;
      return block(node, depth, () -> super.visitEnhancedForLoop(node, depth + 1));
    }

    @Override
    public Void visitWhileLoop(WhileLoopTree node, Integer depth) {
      cc++;
      return block(node, depth, () -> super.visitWhileLoop(node, depth + 1));
    }

    @Override
    public Void visitDoWhileLoop(DoWhileLoopTree node, Integer depth) {
      cc++;
      return block(node, depth, () -> super.visitDoWhileLoop(node, depth + 1));
    }

    @Override
    public Void visitTry(TryTree node, Integer depth) {
      return block(node, depth, () -> super.visitTry(node, depth + 1));
    }

    @Override
    public Void visitSwitch(SwitchTree node, Integer depth) {
      return block(node, depth, () -> super.visitSwitch(node, depth + 1));
    }

    @Override
    public Void visitSwitchExpression(SwitchExpressionTree node, Integer depth) {
      return block(node, depth, () -> super.visitSwitchExpression(node, depth + 1));
    }

    @Override
    public Void visitSynchronized(SynchronizedTree node, Integer depth) {
      return block(node, depth, () -> super.visitSynchronized(node, depth + 1));
    }

    @Override
    public Void visitCatch(CatchTree node, Integer depth) {
      cc++;
      return super.visitCatch(node, depth);
    }

    @Override
    public Void visitCase(CaseTree node, Integer depth) {
      if (!isDefault(node)) {
        cc++;
      }
      return super.visitCase(node, depth);
    }

    @Override
    public Void visitConditionalExpression(ConditionalExpressionTree node, Integer depth) {
      cc++;
      return super.visitConditionalExpression(node, depth);
    }

    @Override
    public Void visitBinary(BinaryTree node, Integer depth) {
      if (node.getKind() == Tree.Kind.CONDITIONAL_AND || node.getKind() == Tree.Kind.CONDITIONAL_OR) {
        cc++;
      }
      return super.visitBinary(node, depth);
    }

    // Only `default` has no expression; `case null, default` counts for its null.
    private static boolean isDefault(CaseTree node) {
      return node.getExpressions().isEmpty();
    }
  }

  static String toJson(List<Row> rows) {
    StringBuilder out = new StringBuilder("[");
    for (Row row : rows) {
      if (out.length() > 1) {
        out.append(',');
      }
      out.append("{\"file\":").append(quote(row.file()))
          .append(",\"name\":").append(quote(row.name()))
          .append(",\"line\":").append(row.line())
          .append(",\"lines\":").append(row.lines())
          .append(",\"cc\":").append(row.cc())
          .append(",\"params\":").append(row.params())
          .append(",\"depth\":").append(row.depth())
          .append('}');
    }
    return out.append(']').toString();
  }

  // Every character outside printable ASCII is escaped, so the output does not
  // depend on the platform's stdout encoding.
  static String quote(String value) {
    StringBuilder out = new StringBuilder("\"");
    for (char c : value.toCharArray()) {
      if (c == '"' || c == '\\') {
        out.append('\\').append(c);
      } else if (c < 0x20 || c > 0x7e) {
        out.append(String.format("\\u%04x", (int) c));
      } else {
        out.append(c);
      }
    }
    return out.append('"').toString();
  }
}
