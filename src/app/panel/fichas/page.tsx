import { redirect } from "next/navigation";

/** Las fichas viven en el listado general de documentos. */
export default function FichasPage() {
  redirect("/panel/documentos?tipo=ficha");
}
