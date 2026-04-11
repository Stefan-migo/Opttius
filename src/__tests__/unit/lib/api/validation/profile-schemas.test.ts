import { describe, expect, it } from "vitest";

import {
  addressSchema,
  passwordChangeSchema,
  personalInfoSchema,
  profileUpdateSchema,
} from "@/lib/api/validation/profile-schemas";

describe("profile-schemas", () => {
  describe("personalInfoSchema", () => {
    it("accepts valid personal info", () => {
      const valid = {
        firstName: "Juan",
        lastName: "Pérez",
        phone: "+56912345678",
        dateOfBirth: "1990-01-15",
        bio: "Óptico profesional",
      };
      expect(personalInfoSchema.parse(valid)).toEqual(valid);
    });

    it("rejects firstName shorter than 2 characters", () => {
      expect(() =>
        personalInfoSchema.parse({ firstName: "J", lastName: "Pérez" }),
      ).toThrow();
    });

    it("rejects lastName shorter than 2 characters", () => {
      expect(() =>
        personalInfoSchema.parse({ firstName: "Juan", lastName: "P" }),
      ).toThrow();
    });

    it("rejects bio longer than 500 characters", () => {
      const longBio = "a".repeat(501);
      expect(() =>
        personalInfoSchema.parse({
          firstName: "Juan",
          lastName: "Pérez",
          bio: longBio,
        }),
      ).toThrow();
    });

    it("accepts optional fields as undefined", () => {
      const minimal = { firstName: "Juan", lastName: "Pérez" };
      expect(personalInfoSchema.parse(minimal)).toEqual(minimal);
    });
  });

  describe("addressSchema", () => {
    it("accepts valid address", () => {
      const valid = {
        addressLine1: "Av. Providencia 1234",
        addressLine2: "Of. 501",
        city: "Santiago",
        state: "RM",
        postalCode: "7500000",
        country: "Chile",
      };
      expect(addressSchema.parse(valid)).toEqual(valid);
    });

    it("defaults country to Chile when omitted", () => {
      const result = addressSchema.parse({
        addressLine1: "Calle 1",
      });
      expect(result.country).toBe("Chile");
    });

    it("requires country to be non-empty when provided", () => {
      const withCountry = {
        addressLine1: "Calle 1",
        country: "Argentina",
      };
      expect(addressSchema.parse(withCountry).country).toBe("Argentina");
    });

    it("accepts minimal address with country", () => {
      const minimal = { country: "Chile" };
      expect(addressSchema.parse(minimal)).toMatchObject({ country: "Chile" });
    });
  });

  describe("passwordChangeSchema", () => {
    it("accepts valid password change", () => {
      const valid = {
        currentPassword: "OldPass123",
        newPassword: "NewPass456",
        confirmPassword: "NewPass456",
      };
      expect(passwordChangeSchema.parse(valid)).toEqual(valid);
    });

    it("rejects empty currentPassword", () => {
      expect(() =>
        passwordChangeSchema.parse({
          currentPassword: "",
          newPassword: "NewPass456",
          confirmPassword: "NewPass456",
        }),
      ).toThrow();
    });

    it("rejects newPassword shorter than 6 characters", () => {
      expect(() =>
        passwordChangeSchema.parse({
          currentPassword: "OldPass123",
          newPassword: "Ab1",
          confirmPassword: "Ab1",
        }),
      ).toThrow();
    });

    it("rejects newPassword without uppercase", () => {
      expect(() =>
        passwordChangeSchema.parse({
          currentPassword: "OldPass123",
          newPassword: "newpass123",
          confirmPassword: "newpass123",
        }),
      ).toThrow();
    });

    it("rejects newPassword without lowercase", () => {
      expect(() =>
        passwordChangeSchema.parse({
          currentPassword: "OldPass123",
          newPassword: "NEWPASS123",
          confirmPassword: "NEWPASS123",
        }),
      ).toThrow();
    });

    it("rejects newPassword without number", () => {
      expect(() =>
        passwordChangeSchema.parse({
          currentPassword: "OldPass123",
          newPassword: "NewPassAbc",
          confirmPassword: "NewPassAbc",
        }),
      ).toThrow();
    });

    it("rejects mismatched confirmPassword", () => {
      expect(() =>
        passwordChangeSchema.parse({
          currentPassword: "OldPass123",
          newPassword: "NewPass456",
          confirmPassword: "Different789",
        }),
      ).toThrow();
    });
  });

  describe("profileUpdateSchema", () => {
    it("accepts partial profile update", () => {
      const update = {
        first_name: "María",
        last_name: "González",
        phone: "+56987654321",
      };
      expect(profileUpdateSchema.parse(update)).toEqual(update);
    });

    it("accepts nullable fields", () => {
      const update = {
        bio: null,
        preferred_branch_id: null,
      };
      expect(profileUpdateSchema.parse(update)).toEqual(update);
    });

    it("rejects first_name shorter than 2 when provided", () => {
      expect(() => profileUpdateSchema.parse({ first_name: "A" })).toThrow();
    });

    it("rejects invalid UUID for preferred_branch_id", () => {
      expect(() =>
        profileUpdateSchema.parse({ preferred_branch_id: "not-a-uuid" }),
      ).toThrow();
    });

    it("accepts valid UUID for preferred_branch_id", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(
        profileUpdateSchema.parse({ preferred_branch_id: uuid })
          .preferred_branch_id,
      ).toBe(uuid);
    });

    it("rejects invalid URL for avatar_url", () => {
      expect(() =>
        profileUpdateSchema.parse({ avatar_url: "not-a-url" }),
      ).toThrow();
    });

    it("accepts newsletter_subscribed boolean", () => {
      expect(
        profileUpdateSchema.parse({ newsletter_subscribed: true })
          .newsletter_subscribed,
      ).toBe(true);
    });
  });
});
