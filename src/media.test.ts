import { expect, test } from "bun:test";
import { resolveMediaImage } from "./media";

test("media bindings resolve item paths and top-level dimensions override nested options", () => {
  const image = resolveMediaImage(
    { asset: { url: "/photo.png", width: 640 }, name: "Product" },
    {
      name: "media",
      src: { path: "asset.url" },
      alt: { template: "{{name}} photo" },
      width: { path: "asset.width" },
      height: 480,
      options: { width: 12, height: 12 },
    },
  );
  expect(image).toMatchObject({
    src: "/photo.png",
    alt: "Product photo",
    width: 640,
    height: 480,
  });
});

test("invalid dimensions are omitted and non-image data URLs cannot become sources", () => {
  const image = resolveMediaImage(
    { url: "/photo.png" },
    { name: "media", width: -1, height: "12px" },
  );
  expect(image?.width).toBeUndefined();
  expect(image?.height).toBeUndefined();
  expect(
    resolveMediaImage(
      { url: "data:text/html,<script>alert(1)</script>" },
      { name: "media" },
    ),
  ).toBeUndefined();
  expect(
    resolveMediaImage({ url: "javascript:alert(1)" }, { name: "media" }),
  ).toBeUndefined();
});
