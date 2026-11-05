// auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java
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