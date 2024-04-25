DROP TABLE IF EXISTS packages;
CREATE TABLE packages (
    name TEXT NOT NULL,
    arch TEXT NOT NULL,
    branch TEXT NOT NULL,
    repo TEXT NOT NULL,
    raw_data TEXT,
    version AS (json_extract(raw_data, '$.version')) STORED,
    desc AS (json_extract(raw_data, '$.desc')) STORED,
    builddate AS (json_extract(raw_data, '$.builddate')) STORED,
    PRIMARY KEY (`name`, `arch`, `branch`, `repo`)
);
