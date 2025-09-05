export const DEFAULT_TEMPLATE_ID = "vite-react";
export const templatesData = [
    {
        id: "vite-react",
        title: "Vite + React Template",
        description: "Uses Vite, React.js, Shadcn/ui, Tailwind CSS and TypeScript - fast and modern development.",
        imageUrl: "https://github.com/user-attachments/assets/5b700eab-b28c-498e-96de-8649b14c16d9",
        icon: "⚡",
        isOfficial: true,
        // This uses the local scaffold directory (no githubUrl means use local scaffold)
    },
    {
        id: "next",
        title: "Next.js Template",
        description: "Uses Next.js, React.js, Shadcn/ui, Tailwind and TypeScript for full-stack applications.",
        imageUrl: "https://github.com/user-attachments/assets/96258e4f-abce-4910-a62a-a9dff77965f2",
        icon: "▲",
        githubUrl: "https://github.com/dyad-sh/nextjs-template",
        isOfficial: true,
    },
    {
        id: "vue",
        title: "Vue.js Template",
        description: "Uses Vue.js 3, Composition API, Tailwind CSS and TypeScript.",
        imageUrl: "https://github.com/user-attachments/assets/vue-template-image",
        icon: "🍃",
        githubUrl: "https://github.com/dyad-sh/vue-template",
        isOfficial: true,
    },
    {
        id: "astro",
        title: "Astro Template",
        description: "Uses Astro for static sites with islands architecture and TypeScript.",
        imageUrl: "https://github.com/user-attachments/assets/astro-template-image",
        icon: "🚀",
        githubUrl: "https://github.com/dyad-sh/astro-template",
        isOfficial: true,
    },
];
export function getTemplateOrThrow(templateId) {
    const template = templatesData.find((template) => template.id === templateId);
    if (!template) {
        throw new Error(`Template ${templateId} not found`);
    }
    return template;
}
export function getTemplateById(templateId) {
    return templatesData.find((template) => template.id === templateId);
}
export function getOfficialTemplates() {
    return templatesData.filter((template) => template.isOfficial);
}
export function getCommunityTemplates() {
    return templatesData.filter((template) => !template.isOfficial);
}
