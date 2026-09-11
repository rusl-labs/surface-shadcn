import contactScalars from "../schemas/pragmatic/contact.scalars.schema.json";
import currencyCode from "../schemas/pragmatic/currency-code.schema.json";
import money from "../schemas/pragmatic/money.schema.json";

/** Installed canonical documents; identifiers remain unchanged and resolve offline. */
export const shadcnSchemas = {
  [contactScalars.$id]: contactScalars,
  [currencyCode.$id]: currencyCode,
  [money.$id]: money,
};
