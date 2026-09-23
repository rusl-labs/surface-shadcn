import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import {
  createSurfaceUi,
  InMemoryAnnotationResolver,
  InMemorySchemaFetchResolver,
  type Schema,
} from "@rusl-labs/surface";
import { createAjvValidator } from "@rusl-labs/surface-ajv";
import { createShadcnKit } from "../registry/surface/kit";
import { SHADCN_AVATAR_ID } from "./constants";

const id = "urn:surface:avatar";

const schema = {
  $id: id,
  type: "object",
  properties: {
    photo: { type: "object" },
    monogram: { type: "object" },
    tile: { type: "object" },
    mark: { type: "object" },
  },
} as Schema;

function avatar(size: string, shape: string, title: string | undefined = "profile.name") {
  return {
    name: "avatar",
    $kind: SHADCN_AVATAR_ID,
    src: "profile.avatarUrl",
    ...(title !== undefined ? { title } : {}),
    size,
    shape,
  };
}

const OriginalImage = window.Image;

afterEach(() => {
  cleanup();
  window.Image = OriginalImage;
});

/** happy-dom does not decode remote images; report them loaded immediately. */
class LoadedImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 0;
  crossOrigin: string | null = null;
  referrerPolicy = "";
  sizes = "";
  srcset = "";
  set src(_value: string) {
    this.complete = true;
    this.naturalWidth = 8;
  }
}

test("avatar display renders a photo, initials, size, and shape", async () => {
  window.Image = LoadedImage as unknown as typeof Image;
  const { Surface } = createSurfaceUi({
    schemaResolver: new InMemorySchemaFetchResolver({ [id]: schema }),
    annotationResolver: new InMemoryAnnotationResolver({
      [id]: {
        subject: id,
        views: {
          default: {
            fields: [
              { name: "photo", label: "Photo", widget: avatar("sm", "circle") },
              {
                name: "monogram",
                label: "Initials",
                widget: avatar("md", "circle"),
              },
              { name: "tile", label: "Square", widget: avatar("lg", "square") },
              {
                name: "mark",
                label: "No name",
                widget: avatar("tiny", "square", undefined),
              },
            ],
          },
        },
      },
    }),
    validator: createAjvValidator(),
    kit: createShadcnKit(),
  });
  const screen = render(
    <Surface
      id={id}
      mode="display"
      data={{
        photo: {
          profile: {
            avatarUrl: "https://images.example/alex.png",
            name: "Alex Morgan",
          },
        },
        monogram: { profile: { name: "Sam Rivera" } },
        tile: {
          profile: {
            avatarUrl: "https://images.example/jordan.png",
            name: "Jordan Lee",
          },
        },
        mark: { profile: {} },
      }}
    />,
  );

  const photo = await screen.findByRole("img", { name: "Alex Morgan" });
  expect(photo.getAttribute("src")).toBe("https://images.example/alex.png");
  expect(
    photo.closest("[data-avatar-size]")?.getAttribute("data-avatar-size"),
  ).toBe("sm");
  expect(
    photo.closest("[data-avatar-shape]")?.getAttribute("data-avatar-shape"),
  ).toBe("circle");

  expect(screen.getByText("SR")).toBeTruthy();
  const square = screen.getByRole("img", { name: "Jordan Lee" });
  expect(square.getAttribute("src")).toBe("https://images.example/jordan.png");
  expect(
    square.closest("[data-avatar-size]")?.getAttribute("data-avatar-size"),
  ).toBe("lg");
  expect(
    square.closest("[data-avatar-shape]")?.getAttribute("data-avatar-shape"),
  ).toBe("square");

  const neutral = screen.getByLabelText("Avatar").closest("[data-avatar-size]");
  expect(neutral?.getAttribute("data-avatar-size")).toBe("tiny");
  expect(neutral?.getAttribute("data-avatar-shape")).toBe("square");
  expect(neutral?.textContent?.trim()).toBe("");
});
