package com.bcp.workshop.auth;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class AuthResourceTest {
    @Test
    void logsInWithWorkshopUser() {
        given()
                .contentType("application/json")
                .body("{\"username\":\"student\",\"password\":\"Workshop123!\",\"client\":\"angular-workshop\"}")
                .when().post("/auth/login")
                .then()
                .statusCode(200)
                .body("user.username", is("student"))
                .body("token", notNullValue());
    }

    @Test
    void logsInWithTrainerAndReturnsTrainerRole() {
        postLogin(Map.of("username", "trainer", "password", "Trainer123!"))
                .statusCode(200)
                .body("user.username", is("trainer"))
                .body("user.role", is("TRAINER"))
                .body("token", notNullValue());
    }

    @Test
    void successfulLoginKeepsTheObservedResponseShape() {
        postLogin(Map.of("username", "student", "password", "Workshop123!", "client", "angular-workshop"))
                .statusCode(200)
                .body("token", not(emptyOrNullString()))
                .body("expiresIn", is(3600))
                .body("user.username", is("student"))
                .body("user.displayName", is("Workshop Student"))
                .body("user.role", is("STUDENT"))
                .body("debug", is("authenticated-with-legacy-flow"));
    }

    @Test
    void rejectsWrongPasswordWithoutToken() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "student", "password", "wrong")));
    }

    @Test
    void rejectsUnknownUserWithoutTokenAndKeepsMessage() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "nobody", "password", "x")))
                .body("message", is("Invalid user nobody or password"));
    }

    @Test
    void usernameMatchIsExactAndCaseSensitive() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "STUDENT", "password", "Workshop123!")));
    }

    @Test
    void rejectsMissingUsername() {
        postLogin(Map.of("password", "x"))
                .statusCode(400)
                .body("message", is("Username is required"));
    }

    @Test
    void rejectsBlankUsername() {
        postLogin(Map.of("username", "  ", "password", "x"))
                .statusCode(400)
                .body("message", is("Username is required"));
    }

    @Test
    void rejectsMissingPassword() {
        postLogin(Map.of("username", "student"))
                .statusCode(400)
                .body("message", is("Password is required"));
    }

    @Test
    void rejectsBlankPassword() {
        postLogin(Map.of("username", "student", "password", "  "))
                .statusCode(400)
                .body("message", is("Password is required"));
    }

    @Test
    void legitimateSingleQuoteInUsernameIsRejectedAsInvalidCredentialsNotAsServerError() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "o'brien", "password", "x")));
    }

    @Test
    void sqlSyntaxOnlyInUsernameWithWrongPasswordDoesNotAuthenticate() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "' OR '1'='1", "password", "x")));
    }

    @Test
    void sqlSyntaxInPasswordDoesNotAuthenticateExistingUser() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "student", "password", "' OR '1'='1")));
    }

    @Test
    void sqlCommentInUsernameDoesNotAuthenticate() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "' OR '1'='1' --", "password", "x")));
    }

    @Test
    void sqlSyntaxInBothFieldsDoesNotAuthenticate() {
        assertRejectedWithoutToken(postLogin(Map.of("username", "' OR '1'='1", "password", "' OR '1'='1")));
    }

    private static ValidatableResponse postLogin(Map<String, String> body) {
        return given()
                .contentType("application/json")
                .body(body)
                .when().post("/auth/login")
                .then();
    }

    private static ValidatableResponse assertRejectedWithoutToken(ValidatableResponse response) {
        return response
                .statusCode(401)
                .body("token", nullValue());
    }
}
