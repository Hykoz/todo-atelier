CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(120),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE todos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (username, password, email, role) VALUES
  ('admin', '54838e0bc0086401:621a972aca99b97cf49e6c0f2ae130e3382a6a5d2948c7', 'admin@atelier.local', 'admin'),
  ('alice', '70c4d06ede135987:9b303361b3af3035ecaa03f6a47415052f236f9d13031c', 'alice@atelier.local', 'user'),
  ('bob',   'e0bf113c08c56168:17598423c981d6738d486afe82ec4965940e8d48236899', 'bob@atelier.local',   'user');

INSERT INTO todos (user_id, title, description, done) VALUES
  (1, 'Sauvegarder la base de données', 'Vérifier que la sauvegarde de la nuit s’est bien terminée.', false),
  (1, 'Renouveler le certificat du serveur', 'Il expire à la fin du mois.', false),
  (1, 'Clé d’API de production', 'ATELIER-KEY-7F3A91 (à ne pas partager)', true),
  (2, 'Acheter du lait', 'Et du pain.', false),
  (2, 'Préparer le cours de lundi', 'Relire les slides sur la sécurité applicative.', false),
  (2, 'Réserver le train', 'Aller le vendredi soir, retour le dimanche.', true),
  (3, 'Réviser le cours de réseaux', 'Chapitre sur le routage.', false),
  (3, 'Appeler le dentiste', 'Prendre rendez-vous avant la fin de l’année.', false),
  (3, 'Code Wi-Fi du labo', 'LABO-WIFI-2026-fictif', true);
