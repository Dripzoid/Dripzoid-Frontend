ALTER TABLE products ADD COLUMN subcategory TEXT;
ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN images TEXT; -- JSON string of image URLs
ALTER TABLE products ADD COLUMN updated_at TEXT;
