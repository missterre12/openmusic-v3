exports.up = (pgm) => {
  pgm.createTable('playlists_songs', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    playlist_id: {
      type: 'VARCHAR(50)',
      references: 'playlists',
      onDelete: 'CASCADE',
      nullable: true,
    },
    song_id: {
      type: 'VARCHAR(50)',
      references: 'songs',
      onDelete: 'CASCADE',
      nullable: true,
    },
  });

  pgm.addConstraint('playlists_songs', 'fk_playlists_songs.playlist_id_playlists.id', 'FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE');
  pgm.addConstraint('playlists_songs', 'fk_playlists_songs.song_id_songs.id', 'FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE');
};

exports.down = (pgm) => {
  pgm.dropConstraint('playlists_songs', 'fk_playlists_songs.playlist_id_playlists.id');
  pgm.dropConstraint('playlists_songs', 'fk_playlists_songs.song_id_songs.id');
  pgm.dropTable('playlists_songs');
};
