/**
 * Integração com Google Sheets via Google Apps Script (Web App)
 *
 * Planilha ID: 1F1qUYkW9--r8U2eCHvOpruZue-HdQRh9T5HroiE5Rws
 *
 * Mapeamento de abas e colunas:
 *   6ºAno A  → aba "6°Ano A (Lydia)"  → coluna W (a partir da linha 5)
 *   6ºAno B  → aba "6ºAno B"          → coluna W (a partir da linha 5)
 *   6ºAno C  → aba "6ºAnoC"           → coluna Z (a partir da linha 5)
 */

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxH0N6pTZQ-dlgO8sfQ2isK-LLYeCY476YGWD9FMUkLcJFFxMHiChTki_qG8Fl1K8k/exec";

interface SheetConfig {
  sheetName: string;
  column: string;
  startRow: number;
}

/**
 * Mapeamento exato das turmas para abas e colunas da planilha real
 */
const SHEET_CONFIG_MAP: Record<string, SheetConfig> = {
  "6ºAno A": { sheetName: "6°Ano A (Lydia)", column: "W", startRow: 5 },
  "6ºAno B": { sheetName: "6ºAno B",         column: "W", startRow: 5 },
  "6ºAno C": { sheetName: "6ºAnoC",          column: "Z", startRow: 5 },
};

/**
 * Envia uma linha de dados para o Google Sheets via Apps Script Web App.
 */
export async function appendToGoogleSheets(
  sheetName: string,
  column: string,
  startRow: number,
  values: (string | number | boolean | null)[]
): Promise<void> {
  const body = {
    sheetName,
    column,
    startRow,
    values,
  };

  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain", // evita preflight CORS no Apps Script
    },
    body: JSON.stringify(body),
    redirect: "follow",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Apps Script HTTP error:", response.status, text);
    throw new Error(`Falha ao contactar o Apps Script: HTTP ${response.status}`);
  }

  let result: { success: boolean; message?: string; error?: string };
  try {
    result = await response.json();
  } catch {
    const text = await response.text();
    console.error("Apps Script retornou resposta não-JSON:", text.slice(0, 300));
    throw new Error(
      "Apps Script retornou resposta inesperada. Verifique se o Web App está publicado como 'Qualquer pessoa'."
    );
  }

  if (!result.success) {
    console.error("Apps Script erro lógico:", result.error || result.message);
    throw new Error(`Apps Script: ${result.error || result.message || "erro desconhecido"}`);
  }
}

/**
 * Formata as respostas do aluno em uma string para gravar na coluna da planilha.
 * Formato da célula: "Nome | Q1:B | Q2:A | Q3:C | ... | DD/MM/YYYY HH:MM"
 */
export function formatResponsesForSheets(
  studentName: string,
  answers: Array<{ questionId: number; answer: string }>
): (string | number | boolean | null)[] {
  const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const answersStr = answers
    .sort((a, b) => a.questionId - b.questionId)
    .map((a) => `Q${a.questionId}:${a.answer}`)
    .join(" | ");

  return [`${studentName} | ${answersStr} | ${timestamp}`];
}

/**
 * Retorna a configuração da aba com base na turma do aluno.
 */
export function getSheetConfig(grade: string): { sheetName: string; column: string; startRow: number } {
  const config = SHEET_CONFIG_MAP[grade];
  if (!config) {
    console.warn(`Turma desconhecida: "${grade}". Usando fallback.`);
    return { sheetName: "Respostas", column: "A", startRow: 2 };
  }
  return config;
}
