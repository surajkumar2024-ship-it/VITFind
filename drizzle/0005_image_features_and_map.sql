ALTER TABLE reports ADD COLUMN latitude REAL;
ALTER TABLE reports ADD COLUMN longitude REAL;
ALTER TABLE reports ADD COLUMN locationNote TEXT NOT NULL DEFAULT '';
CREATE TABLE image_features (
  scope TEXT NOT NULL,
  image TEXT NOT NULL,
  model TEXT NOT NULL,
  embedding TEXT NOT NULL,
  actor TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (scope, image, model)
);
