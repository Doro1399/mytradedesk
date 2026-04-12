import type { KeyboardEvent } from "react";

/**
 * Enter dans un champ de saisie valide l’action principale (équivalent au bouton de confirmation).
 * Exclut textarea, select, liens, cases à cocher / radios, fichier, et boutons.
 */
export function handleModalEnterToSubmit(
  e: KeyboardEvent,
  submit: () => void,
  disabled?: boolean
): void {
  if (e.key !== "Enter") return;
  const t = e.target as HTMLElement | null;
  if (!t) return;
  if (t.tagName === "TEXTAREA") return;
  if (t.tagName === "SELECT") return;
  if (t.tagName === "BUTTON") return;
  if (t.tagName === "A") return;
  if (t.tagName === "INPUT") {
    const type = (t as HTMLInputElement).type?.toLowerCase() ?? "";
    if (type === "checkbox" || type === "radio" || type === "file" || type === "hidden") return;
  }
  if (disabled) return;
  e.preventDefault();
  submit();
}
