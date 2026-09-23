import { expect, test } from "bun:test";
import { resolveAvatar } from "./avatar";

const portrait = {
  profile: {
    avatarUrl: "https://images.example/alex.png",
    name: "Alex Morgan",
  },
};

test("avatar bindings resolve dotted paths and top-level size and shape win", () => {
  const avatar = resolveAvatar(portrait, {
    name: "avatar",
    src: "profile.avatarUrl",
    title: "profile.name",
    size: "sm",
    shape: "circle",
    options: { size: "xl", shape: "square", src: "missing" },
  });
  expect(avatar).toEqual({
    src: "https://images.example/alex.png",
    title: "Alex Morgan",
    initials: "AM",
    size: "sm",
    shape: "circle",
  });
});

test("avatar src accepts path, template, and literal bindings", () => {
  expect(
    resolveAvatar(portrait, {
      name: "avatar",
      src: { path: "profile.avatarUrl" },
      title: { template: "{{profile.name}}" },
    }).src,
  ).toBe(portrait.profile.avatarUrl);
  expect(
    resolveAvatar(portrait, {
      name: "avatar",
      src: { literal: "https://images.example/fixed.png" },
      title: { literal: "Fixed Name" },
    }),
  ).toMatchObject({
    src: "https://images.example/fixed.png",
    title: "Fixed Name",
    initials: "FN",
  });
});

test("missing src yields initials and a missing title stays neutral", () => {
  expect(
    resolveAvatar(
      { profile: { name: "Sam Rivera" } },
      { name: "avatar", src: "profile.avatarUrl", title: "profile.name" },
    ),
  ).toEqual({
    title: "Sam Rivera",
    initials: "SR",
    size: "md",
    shape: "circle",
  });
  expect(
    resolveAvatar(
      { profile: { avatarUrl: "" } },
      { name: "avatar", src: "profile.avatarUrl" },
    ),
  ).toEqual({ size: "md", shape: "circle" });
});

test("initials take the first letter of each word and keep two", () => {
  expect(
    resolveAvatar(
      { profile: { name: "mary jane watson" } },
      { name: "avatar", title: "profile.name" },
    ).initials,
  ).toBe("MJ");
  expect(
    resolveAvatar(
      { profile: { name: "Émile" } },
      { name: "avatar", title: "profile.name" },
    ).initials,
  ).toBe("É");
});

test("unsafe sources are dropped and invalid size or shape fall back", () => {
  expect(
    resolveAvatar(
      { url: "javascript:alert(1)" },
      { name: "avatar", title: { literal: "Alex" }, size: "huge", shape: "pill" },
    ),
  ).toEqual({
    title: "Alex",
    initials: "A",
    size: "md",
    shape: "circle",
  });
  expect(
    resolveAvatar(
      { url: "/photo.png" },
      { name: "avatar", options: { size: "xl", shape: "rounded" } },
    ),
  ).toMatchObject({ src: "/photo.png", size: "xl", shape: "rounded" });
});
