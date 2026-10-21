/**
 * Génère la fiche d'inscription Word envoyée par WhatsApp (procédure de secours) :
 *   public/formulaires/fiche-inscription-garden-of-alliance.docx
 *
 * Usage : node scripts/generate-registration-form.mjs
 * (paquet npm « docx » requis : npx -p docx@9 node scripts/generate-registration-form.mjs)
 *
 * Les libellés de la colonne de gauche doivent rester identiques à FORM_FIELDS
 * (src/lib/registration-form.ts) : c'est par eux que l'admin retrouve les réponses.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, BorderStyle, HeadingLevel, LevelFormat, Footer, PageNumber, VerticalAlign,
} = require("docx");

const GREEN = "486B46";
const DARK = "2E4A36";
const MUTED = "6B7280";
const LIGHT = "EEF3EC";
const SUPPORT_PHONE = "+237 620 51 41 42";

const PAGE_WIDTH = 11906 - 2 * 1134; // A4, marges 2 cm
const LABEL_W = 3800;
const VALUE_W = PAGE_WIDTH - LABEL_W;

const border = { style: BorderStyle.SINGLE, size: 4, color: "C9D3C7" };
const borders = { top: border, bottom: border, left: border, right: border };

const p = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: [new TextRun({ text, ...(opts.run || {}) })] });

/** Ligne « libellé | réponse ». Le 1er paragraphe de la cellule de gauche est le libellé lu à l'import. */
const fieldRow = (label, hint) => new TableRow({
  children: [
    new TableCell({
      borders,
      width: { size: LABEL_W, type: WidthType.DXA },
      shading: { fill: LIGHT, type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 70, bottom: 70, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({ children: [new TextRun({ text: label, bold: true, color: DARK, size: 21 })] }),
        ...(hint ? [new Paragraph({ children: [new TextRun({ text: hint, color: MUTED, size: 16, italics: true })] })] : []),
      ],
    }),
    new TableCell({
      borders,
      width: { size: VALUE_W, type: WidthType.DXA },
      margins: { top: 70, bottom: 70, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ children: [new TextRun({ text: "", size: 22 })] })],
    }),
  ],
});

const fieldTable = (rows) => new Table({
  width: { size: PAGE_WIDTH, type: WidthType.DXA },
  columnWidths: [LABEL_W, VALUE_W],
  rows: rows.map(([label, hint]) => fieldRow(label, hint)),
});

const heading = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, bold: true, color: GREEN, size: 26 })],
});

const doc = new Document({
  creator: "Garden of Alliance",
  title: "Fiche d'inscription — Garden of Alliance",
  styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
  numbering: {
    config: [{
      reference: "steps",
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } } } }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1134, right: 1134 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Garden of Alliance — fiche confidentielle, réservée à l'équipe. Page ", color: MUTED, size: 16 }),
            new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 }),
          ],
        })],
      }),
    },
    children: [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "Fiche d'inscription", bold: true, color: DARK, size: 40 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 8 } },
        children: [new TextRun({ text: "Garden of Alliance — à n'utiliser que si l'inscription en ligne ne fonctionne pas", color: MUTED, size: 20 })],
      }),

      p("Vous n'arrivez pas à vous inscrire en ligne ? Remplissez cette fiche : notre équipe créera votre compte et complétera votre profil pour vous."),
      ...[
        "Remplissez la colonne de droite. Ne modifiez pas la colonne de gauche.",
        "N'ajoutez PAS vos photos dans ce document : envoyez-les séparément sur WhatsApp (étape 4).",
        `Enregistrez le fichier et envoyez-le sur WhatsApp au ${SUPPORT_PHONE}.`,
      ].map((text) => new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 80 }, children: [new TextRun(text)] })),

      heading("1. Votre compte"),
      fieldTable([
        ["Adresse e-mail de l'inscription", "Celle de votre futur compte (obligatoire)"],
      ]),

      heading("2. Votre identité"),
      fieldTable([
        ["Pseudonyme", "Nom public, 2 à 30 caractères"],
        ["Prénom", null],
        ["Nom", null],
        ["Genre", "Homme ou Femme"],
        ["Date de naissance", "JJ/MM/AAAA — 18 ans minimum"],
        ["Téléphone", "Avec l'indicatif, ex. +237 6 90 12 34 56"],
      ]),

      heading("3. Votre parcours"),
      fieldTable([
        ["Comment nous avez-vous connus ?", "TikTok, Instagram, Facebook, WhatsApp, YouTube, Bouche à oreille ou Autre"],
        ["Situation", "Célibataire, Veuf / Veuve ou Divorcé(e)"],
        ["Pays de résidence", "Ex. Cameroun, Gabon, France…"],
        ["Ville", "Ex. Douala, Libreville, Paris…"],
        ["Vos valeurs (3 au maximum)", "Prière Quotidienne, Foyer Uni, Ambition & Travail, Respect Mutuel, Éducation Chrétienne, Service à l'Église"],
      ]),

      heading("4. Vos photos — à envoyer sur WhatsApp"),
      p(`Ne collez pas vos photos dans ce document. Envoyez 3 photos récentes de vous, seul(e), visage bien visible et sans filtre, directement sur WhatsApp au ${SUPPORT_PHONE}, avec la fiche remplie et l'adresse e-mail de votre inscription. Elles restent privées jusqu'à la validation de votre profil.`),

      heading("Et ensuite ?"),
      p("Une fois votre compte créé, un administrateur vous enverra votre mot de passe sur WhatsApp. Vous pourrez le changer depuis « Mot de passe oublié ». Pour votre sécurité, votre selfie de vérification et l'acceptation de la charte restent à faire par vous-même, et vous choisirez votre photo publique à votre première connexion.", { run: { size: 19 } }),
    ],
  }],
});

mkdirSync("public/formulaires", { recursive: true });
const out = "public/formulaires/fiche-inscription-garden-of-alliance.docx";
writeFileSync(out, await Packer.toBuffer(doc));
console.log(`Fiche écrite : ${out}`);
