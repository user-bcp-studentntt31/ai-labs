// auth/src/test/java/com/bcp/workshop/auth/AuthResourceTest.java
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