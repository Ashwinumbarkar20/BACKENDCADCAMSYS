// Resources that can be assigned to a Role's permission matrix.
// Owner-only resources (roles, settings, footer, navigation, media-library)
// are NOT here — they require isOwner regardless of role.
//
// `users` IS assignable so owners can delegate team-admin work to a role, but
// the users controller adds extra guards: non-owners cannot grant isOwner,
// cannot edit existing owner accounts, and cannot delete owners. This prevents
// privilege escalation.
export const ASSIGNABLE_RESOURCES = [
  { key: "pages", label: "Pages" },
  { key: "solutions", label: "Solutions" },
  { key: "product-categories", label: "Product Categories" },
  { key: "products", label: "Products" },
  { key: "industries", label: "Industries" },
  { key: "blogs", label: "Blogs" },
  { key: "case-studies", label: "Case Studies" },
  { key: "testimonials", label: "Testimonials" },
  { key: "tutorials", label: "Tutorials" },
  { key: "team-members", label: "Team Members" },
  { key: "careers", label: "Careers" },
  { key: "news", label: "News" },
  { key: "leads", label: "Leads (form submissions)" },
  { key: "visitors", label: "Visitor tracking" },
  { key: "users", label: "Users" },
];

export const ACTIONS = ["view", "create", "edit", "delete", "publish"];

// True if the user can take `action` on `resource`. Owners bypass the matrix.
export function hasPermission(user, resource, action) {
  if (!user) return false;
  if (user.isOwner) return true;
  if (!user.permissions) return false;
  const entry = user.permissions[resource];
  if (!entry) return false;
  return Boolean(entry[action]);
}

// Flattens a populated Role document into a { [resourceKey]: { view, create, ... } } map
// for fast O(1) lookup at request time.
export function computePermissionsFromRole(role) {
  if (!role || !Array.isArray(role.permissions)) return {};
  const result = {};
  for (const p of role.permissions) {
    if (!p?.resource) continue;
    result[p.resource] = {
      view: !!p.actions?.view,
      create: !!p.actions?.create,
      edit: !!p.actions?.edit,
      delete: !!p.actions?.delete,
      publish: !!p.actions?.publish,
    };
  }
  return result;
}
