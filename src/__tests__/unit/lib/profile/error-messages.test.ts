import { describe, expect, it } from "vitest";

import { getProfileErrorMessage } from "@/lib/profile/error-messages";

describe("getProfileErrorMessage", () => {
  it("returns default message for null error", () => {
    expect(getProfileErrorMessage(null)).toBe("Error al actualizar el perfil.");
  });

  it("maps 23505 to duplicate value message", () => {
    expect(
      getProfileErrorMessage({ code: "23505", message: "duplicate key" }),
    ).toBe("El valor ya existe para otro usuario.");
  });

  it("maps PGRST116 to not found message", () => {
    expect(
      getProfileErrorMessage({ code: "PGRST116", message: "not found" }),
    ).toBe("No se encontró el perfil.");
  });

  it("maps 42501 to permission message", () => {
    expect(
      getProfileErrorMessage({ code: "42501", message: "permission denied" }),
    ).toBe("No tienes permiso para realizar esta acción.");
  });

  it("maps 42P01 to config error message", () => {
    expect(
      getProfileErrorMessage({ code: "42P01", message: "undefined table" }),
    ).toBe("Error de configuración. Contacta al administrador.");
  });

  it("maps 22P02 to invalid format message", () => {
    expect(
      getProfileErrorMessage({ code: "22P02", message: "invalid input" }),
    ).toBe("Formato de datos inválido.");
  });

  it("maps 23503 to invalid reference message", () => {
    expect(
      getProfileErrorMessage({ code: "23503", message: "foreign key" }),
    ).toBe("Referencia inválida. Verifica los datos.");
  });

  it("maps 23502 to required fields message", () => {
    expect(getProfileErrorMessage({ code: "23502", message: "not null" })).toBe(
      "Faltan campos requeridos.",
    );
  });

  it("returns error.message when code is not mapped", () => {
    const customMessage = "Custom database error";
    expect(
      getProfileErrorMessage({ code: "99999", message: customMessage }),
    ).toBe(customMessage);
  });

  it("returns default message when error has no code or message", () => {
    expect(getProfileErrorMessage({})).toBe("Error al actualizar el perfil.");
  });

  it("returns error.message when code is empty string", () => {
    expect(
      getProfileErrorMessage({ code: "", message: "Something went wrong" }),
    ).toBe("Something went wrong");
  });
});
