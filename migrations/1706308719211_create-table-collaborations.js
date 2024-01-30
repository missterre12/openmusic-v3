exports.up = (pgm) => {
    pgm.createTable('collaborations', {
    id: {
        type: 'VARCHAR(50)',
        primaryKey: true,
    },
    playlist_id: {
        type: 'VARCHAR(50)',
        references: 'playlists(id)',
        onDelete: 'cascade',
    },
    user_id: {
        type: 'VARCHAR(50)',
        notNull: true,
    },
    });
  };
  
exports.down = (pgm) => {
    pgm.dropTable('collaborations');
};
  