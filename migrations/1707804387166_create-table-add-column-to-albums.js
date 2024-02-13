exports.up = (pgm) => {
  pgm.addColumns('albums', {
    coverUrl: {
      type: 'VARCHAR(255)',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('albums', ['coverUrl']);
};
