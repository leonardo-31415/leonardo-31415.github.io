CREATE DATABASE openlime;
CREATE USER 'openlime'@'https://leonardo-31415.github.io/TexRec/annotations' IDENTIFIED BY 'NydROTic20';
GRANT ALL PRIVILEGES ON openlime . * TO 'openlime'@'https://leonardo-31415.github.io/TexRec/annotations';
USE openlime;
CREATE TABLE annotations
(
    id VARCHAR(64) PRIMARY KEY, 
    label VARCHAR(64), 
    description TEXT, 
    svg TEXT,
    class VARCHAR(64),
    publish INT(11)
);
DESCRIBE annotations;
