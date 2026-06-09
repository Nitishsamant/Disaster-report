-- Sample seed data for the disaster-report database

INSERT INTO users (name, email, role) VALUES
  ('Alice Admin', 'alice@example.com', 'admin'),
  ('Bob Reporter', 'bob@example.com', 'reporter');

INSERT INTO reports (title, description, location, severity, reporter_id, status) VALUES
  ('Flood in Riverside', 'Severe flooding after heavy rains', 'Riverside', 4, 2, 'open'),
  ('Power outage downtown', 'Citywide outage affecting hospitals', 'Downtown', 5, 2, 'open');

INSERT INTO guidelines (title, content, source) VALUES
  ('Evacuation Procedure', 'Follow local evacuation routes and bring emergency supplies', 'Local Gov'),
  ('Shelter Locations', 'List of available shelters and their capacities', 'Gov Portal');
