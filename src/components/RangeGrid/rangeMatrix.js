const ranks = [
  "A","K","Q","J","T","9","8","7","6","5","4","3","2"
];

export function generateMatrix() {
  const matrix = [];

  for (let i = 0; i < ranks.length; i++) {
    const row = [];

    for (let j = 0; j < ranks.length; j++) {
      const r1 = ranks[i];
      const r2 = ranks[j];
      let label = "";

      if (i === j) {
        label = r1 + r2;
      } else if (i < j) {
        label = r1 + r2 + "s";
      } else {
        label = r2 + r1 + "o";
      }

      row.push({
        label,
        value: 0,
        actions: [],
      });
    }

    matrix.push(row);
  }

  return matrix;
}