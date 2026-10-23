package fixtures;

import java.util.Comparator;
import java.util.List;

public class Sample {
  static final Comparator<String> BY_LENGTH = (a, b) -> {
    if (a.length() > b.length()) {
      return 1;
    }
    return a.length() == b.length() ? 0 : -1;
  };

  private final int size;

  Sample(int size) {
    this.size = size;
  }

  int clean(int a, int b) {
    return a + b;
  }

  @Override
  @Deprecated
  public String toString() {
    return "Sample " + size;
  }

  int complexBranches(int n, boolean a, boolean b) {
    if (n > 0 && a) {
      for (int i = 0; i < n; i++) {
        while (b || a) {
          b = false;
        }
      }
    } else if (n < 0) {
      return -1;
    } else {
      try {
        n++;
      } catch (RuntimeException e) {
        return 0;
      }
    }
    do {
      n--;
    } while (n > 10);
    for (String s : List.of("x")) {
      n += s.length();
    }
    return switch (n) {
      case 1, 2 -> 1;
      case 3 -> a ? 2 : 4;
      default -> 3;
    };
  }

  void tooManyParams(int a, int b, int c, int d, int e) {}

  void callbacks(List<String> items) {
    items.forEach(s -> {
      if (s.isEmpty()) {
        System.out.println("empty");
      }
    });
    new Thread() {
      @Override
      public void run() {
        if (size > 0) {
          System.out.println(size);
        }
      }
    }.start();
  }

  @SuppressWarnings("unchecked") // the raw list comes from a legacy API
  List<String> legacy(Object raw) {
    return (List<String>) raw; // NOSONAR
  }

  interface Shape {
    double area();

    default String label() {
      return "shape";
    }
  }
}
