function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['"]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function publishablePlugin(schema) {
  schema.add({
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date, default: null, index: true },
  });

  // Mongoose 9: pre("save") receives save options as args — do not use a `next` callback.
  schema.pre("save", function publishablePreSave() {
    if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();
    if (this.status === "draft" && this.publishedAt) this.publishedAt = null;
    if (schema.path("slug") && !this.slug && this.title) {
      this.slug = slugify(this.title);
    }
  });
}

export { slugify };
