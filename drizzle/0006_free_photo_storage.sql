CREATE TABLE photo_budget (
  id TEXT PRIMARY KEY NOT NULL,
  usedBytes INTEGER NOT NULL DEFAULT 0 CHECK (usedBytes >= 0),
  maxBytes INTEGER NOT NULL CHECK (maxBytes > 0)
);
INSERT INTO photo_budget (id,usedBytes,maxBytes) VALUES ('photos',0,209715200);
CREATE TABLE photo_blobs (
  scope TEXT NOT NULL,
  id TEXT NOT NULL,
  data BLOB NOT NULL,
  byteLength INTEGER NOT NULL CHECK (byteLength > 0 AND byteLength <= 524288 AND byteLength = length(data)),
  createdAt INTEGER NOT NULL,
  PRIMARY KEY (scope,id)
);
CREATE TRIGGER photo_budget_check BEFORE INSERT ON photo_blobs BEGIN
  SELECT RAISE(ABORT,'PHOTO_STORAGE_FULL') WHERE
    NOT EXISTS (SELECT 1 FROM photo_budget WHERE id='photos' AND usedBytes + NEW.byteLength <= maxBytes);
END;
CREATE TRIGGER photo_budget_add AFTER INSERT ON photo_blobs BEGIN
  UPDATE photo_budget SET usedBytes=usedBytes+NEW.byteLength WHERE id='photos';
END;
CREATE TRIGGER photo_budget_remove AFTER DELETE ON photo_blobs BEGIN
  UPDATE photo_budget SET usedBytes=usedBytes-OLD.byteLength WHERE id='photos';
END;
CREATE TRIGGER photo_blob_immutable BEFORE UPDATE ON photo_blobs BEGIN
  SELECT RAISE(ABORT,'PHOTO_BLOB_IMMUTABLE');
END;
