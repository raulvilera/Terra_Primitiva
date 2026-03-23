import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  students: router({
    getByGrade: publicProcedure
      .input((val: any) => val)
      .query(async ({ input }) => {
        const { grade } = input;
        const { getAllStudentsByGrade } = await import("./db");
        return await getAllStudentsByGrade(grade);
      }),

    getById: publicProcedure
      .input((val: any) => val)
      .query(async ({ input }) => {
        const { id } = input;
        const { getStudentById } = await import("./db");
        return await getStudentById(id);
      }),
  }),

  activity: router({
    submit: publicProcedure
      .input((val: any) => val)
      .mutation(async ({ input }) => {
        const { studentName, grade, answers } = input;

        if (!studentName || !grade || !answers) {
          throw new Error("Missing required fields");
        }

        const { createActivityResponse, updateActivityResponseSyncStatus } = await import("./db");
        const { appendToGoogleSheets, formatResponsesForSheets, getSheetConfig } = await import("./google-sheets");

        // Salva no banco de dados
        const result = await createActivityResponse({
          studentName,
          grade,
          answers: JSON.stringify(answers),
          syncStatus: "pending",
        });

        // Tenta enviar para o Google Sheets
        try {
          const { sheetName, column, startRow } = getSheetConfig(grade);
          const formattedData = formatResponsesForSheets(studentName, answers);

          await appendToGoogleSheets(sheetName, column, startRow, formattedData);

          if (result?.id) {
            await updateActivityResponseSyncStatus(result.id, "synced");
          }
        } catch (error) {
          console.error("Falha ao sincronizar com Google Sheets:", error);
          if (result?.id) {
            await updateActivityResponseSyncStatus(result.id, "failed");
          }
        }

        return {
          success: true,
          id: result?.id,
          message: "Respostas enviadas com sucesso!",
        };
      }),

    getByGrade: publicProcedure
      .input((val: any) => val)
      .query(async ({ input }) => {
        const { grade } = input;
        const { getActivityResponsesByGrade } = await import("./db");
        return await getActivityResponsesByGrade(grade);
      }),
  }),
});

export type AppRouter = typeof appRouter;
