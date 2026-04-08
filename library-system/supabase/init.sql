-- ═══════════════════════════════════════════════════════════════════
-- Library Management System – Database Schema
-- ═══════════════════════════════════════════════════════════════════

-- Allow PostgREST anon role
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA public TO anon;

-- ───────────────────────────────────────────────────────────────────
-- BOOKS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    author      VARCHAR(255) NOT NULL,
    isbn        VARCHAR(20),
    cost        NUMERIC(10, 2) DEFAULT 0.00,
    status      VARCHAR(10) NOT NULL DEFAULT 'IN'
                  CHECK (status IN ('IN', 'OUT', 'LOST')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- PATRONS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patrons (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(30),
    address         TEXT,
    num_books       INT NOT NULL DEFAULT 0 CHECK (num_books >= 0 AND num_books <= 6),
    fine_balance    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    membership_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD'
                      CHECK (membership_type IN ('STANDARD', 'PREMIUM', 'STUDENT', 'SENIOR')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- LOANS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
    id          SERIAL PRIMARY KEY,
    book_id     INT NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    patron_id   INT NOT NULL REFERENCES patrons(id) ON DELETE RESTRICT,
    checked_out TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date    DATE NOT NULL,
    returned_at TIMESTAMPTZ,
    status      VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'OVERDUE', 'RETURNED', 'LOST')),
    fine_amount NUMERIC(10, 2) DEFAULT 0.00,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- FINE PAYMENTS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fine_payments (
    id          SERIAL PRIMARY KEY,
    patron_id   INT NOT NULL REFERENCES patrons(id) ON DELETE RESTRICT,
    loan_id     INT REFERENCES loans(id) ON DELETE SET NULL,
    amount      NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    note        TEXT,
    paid_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- AUDIT LOG
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    action      VARCHAR(50) NOT NULL,
    entity      VARCHAR(50) NOT NULL,
    entity_id   INT,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- INDEXES
-- ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_status   ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_isbn     ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_loans_status   ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loans_patron   ON loans(patron_id);
CREATE INDEX IF NOT EXISTS idx_loans_book     ON loans(book_id);

-- ───────────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at   BEFORE UPDATE ON books   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER patrons_updated_at BEFORE UPDATE ON patrons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER loans_updated_at   BEFORE UPDATE ON loans   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ───────────────────────────────────────────────────────────────────
-- FUNCTION: mark overdue loans automatically
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_overdue_loans()
RETURNS void AS $$
BEGIN
    UPDATE loans
    SET    status = 'OVERDUE',
           fine_amount = ROUND((CURRENT_DATE - due_date) * 0.50, 2)
    WHERE  status = 'ACTIVE'
    AND    due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────
-- GRANT permissions to anon role
-- ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO anon;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ───────────────────────────────────────────────────────────────────
-- SEED DATA – mirrors your books.json
-- ───────────────────────────────────────────────────────────────────
INSERT INTO books (title, author, isbn, cost, status) VALUES
    ('The Great Gatsby',           'F. Scott Fitzgerald', '978-0743273565', 12.99, 'IN'),
    ('To Kill a Mockingbird',      'Harper Lee',          '978-0061935466', 14.99, 'IN'),
    ('1984',                       'George Orwell',       '978-0451524935',  9.99, 'IN'),
    ('Pride and Prejudice',        'Jane Austen',         '978-0141439518',  8.99, 'IN'),
    ('The Catcher in the Rye',     'J.D. Salinger',       '978-0316769174', 11.99, 'IN'),
    ('Brave New World',            'Aldous Huxley',       '978-0060850524', 13.99, 'IN'),
    ('The Hobbit',                 'J.R.R. Tolkien',      '978-0547928227', 15.99, 'IN'),
    ('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', '978-0439708180', 18.99, 'IN'),
    ('The Lord of the Rings',      'J.R.R. Tolkien',      '978-0544003415', 29.99, 'IN'),
    ('Animal Farm',                'George Orwell',       '978-0451526342',  7.99, 'IN')
ON CONFLICT DO NOTHING;

INSERT INTO patrons (first_name, last_name, email, phone, membership_type) VALUES
    ('Alice',  'Johnson',  'alice@example.com',  '555-0101', 'STANDARD'),
    ('Bob',    'Smith',    'bob@example.com',    '555-0102', 'PREMIUM'),
    ('Carol',  'Williams', 'carol@example.com',  '555-0103', 'STUDENT'),
    ('David',  'Brown',    'david@example.com',  '555-0104', 'SENIOR')
ON CONFLICT DO NOTHING;
