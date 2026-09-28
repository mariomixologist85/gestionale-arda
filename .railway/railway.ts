import { defineRailway, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "gestionale-arda";

export default defineRailway(() => {
  const gestionale_arda = service("gestionale-arda", {
    source: {
      repo: "mariomixologist85/gestionale-arda",
      branch: "main"
    },
    variables: {
      // Riferimento al servizio Postgres dello stesso progetto: senza questa
      // dichiarazione l'IaC cancellerebbe la variabile al primo apply
      DATABASE_URL: { value: "${{Postgres.DATABASE_URL}}" }
    },
    build: {
      builder: "NIXPACKS",
      buildCommand: "npm install && npm --prefix frontend install && npm --prefix frontend run build"
    },
    deploy: {
      startCommand: "npm start",
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10
    }
  });
  return project("delightful-education", {
    resources: [gestionale_arda]
  });
});
