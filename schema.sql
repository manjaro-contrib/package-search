DROP TABLE IF EXISTS packages;
CREATE TABLE packages (
    name TEXT NOT NULL,
    arch TEXT NOT NULL,
    branch TEXT NOT NULL,
    repo TEXT NOT NULL,
    raw_data TEXT,
    PRIMARY KEY (`name`, `arch`, `branch`, `repo`)
);
