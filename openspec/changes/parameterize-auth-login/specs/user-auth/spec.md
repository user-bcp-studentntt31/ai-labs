# Spec Delta

## Purpose

Define el comportamiento observable del inicio de sesión para usuarios válidos y el rechazo de credenciales inválidas, evitando que entradas manipuladas concedan acceso no autorizado.

## ADDED Requirements

### Requirement: Preserve successful login behavior
The system SHALL preserve successful login through `POST /auth/login` for valid credentials, returning HTTP `200` with the authenticated username and a token.

#### Scenario: Valid workshop student credentials
- **WHEN** a client submits username `student` and password `Workshop123!` to `POST /auth/login`
- **THEN** the response is HTTP `200` and contains `user.username` equal to `student` and a non-empty `token`

### Requirement: Reject invalid credentials
The system SHALL reject credentials that do not identify a valid user with HTTP `401` and SHALL NOT return an authentication token.

#### Scenario: Incorrect password
- **WHEN** a client submits a valid username with an incorrect password to `POST /auth/login`
- **THEN** the response is HTTP `401` and does not contain a `token`

### Requirement: Credential input cannot bypass authentication
The system SHALL treat supplied username and password values as credential data, so SQL syntax in either value cannot authenticate a user unless the supplied credentials are valid.

#### Scenario: SQL syntax supplied as username
- **WHEN** a client submits `' OR '1'='1` as the username to `POST /auth/login`
- **THEN** the response is HTTP `401` and does not contain a `token`

#### Scenario: SQL syntax supplied as password
- **WHEN** a client submits `' OR '1'='1` as the password to `POST /auth/login`
- **THEN** the response is HTTP `401` and does not contain a `token`
