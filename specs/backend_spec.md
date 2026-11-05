```java
// LegacyDatabase.java
package pe.bcp.login.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

@ApplicationScoped
public class LegacyDatabase {
    private static final String FIND_BY_CREDENTIALS_SQL =
            "SELECT username FROM users WHERE username = ? AND password = ?";

    private final DataSource dataSource;

    @Inject
    public LegacyDatabase(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Optional<AuthenticatedUser> findByCredentials(String username, String password) {
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(FIND_BY_CREDENTIALS_SQL)) {
            statement.setString(1, username);
            statement.setString(2, password);

            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return Optional.empty();
                }
                return Optional.of(new AuthenticatedUser(resultSet.getString("username")));
            }
        } catch (SQLException exception) {
            throw new PersistenceException("Unable to validate credentials", exception);
        }
    }

    public record AuthenticatedUser(String username) {
    }
}
```

```java
// AuthResourceTest.java
package pe.bcp.login.service;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AuthResourceTest {
    private static final String LOGIN_PATH = "/auth/login";
    private static final String INJECTION_VALUE = "' OR '1'='1";

    @Test
    void validCredentialsStillReturnUserAndToken() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", "student", "password", "Workshop123!"))
                .when()
                .post(LOGIN_PATH)
                .then()
                .statusCode(200)
                .body("user.username", is("student"))
                .body("token", notNullValue());
    }

    @Test
    void injectionInUsernameOrPasswordIsRejectedWithoutToken() {
        assertUnauthorized(INJECTION_VALUE, "Workshop123!");
        assertUnauthorized("student", INJECTION_VALUE);
    }

    private void assertUnauthorized(String username, String password) {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("username", username, "password", password))
                .when()
                .post(LOGIN_PATH)
                .then()
                .statusCode(401)
                .body("$", not(hasKey("token")));
    }
}
```

Supuesto: la tabla y columnas existentes son `users(username, password)`; no se proporcionó el esquema ni el código actual para confirmar la firma de `findByCredentials`.