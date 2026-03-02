const portfolioData = {
  /* ─── PERSONAL ─── */
  name: 'Sai Tata',
  email: 'saitata7@gmail.com',
  copyright: '2026 Sai Tata',
  footerTagline: 'Built with AI & passion for building intelligent systems',

  social: {
    github: 'https://github.com/Saitata7',
    linkedin: 'https://linkedin.com/in/sait007',
  },

  /* ─── ABOUT ─── */
  about: {
    label: 'About',
    title: 'From idea to production,\nI build the full AI stack',
    description:
      'Voice assistants that answer real calls. Autonomous agents that build workflows. Developer tools published on npm. I take AI from prototype to production — 5+ years shipping ML models, LLM apps, and full-stack platforms across healthcare, legal tech, and developer tooling.',
    stats: 'MS Computer Science \u2022 AWS Certified Developer \u2022 5+ years shipping AI systems',
  },

  /* ─── PROJECTS ─── */
  projects: {
    label: 'Projects',
    title: 'Things I shipped',
    description: 'Real AI products — from voice platforms handling calls to agents that build themselves.',
    items: [
      {
        icon: '\uD83C\uDF99\uFE0F',
        title: 'Voycee — Voice AI Platform',
        description:
          'Full-stack voice AI call assistant that automates inbound calls for restaurants and hospitals. Multi-language support, real-time analytics, appointment scheduling.',
        tags: ['Next.js', 'NestJS', 'Vapi AI', 'Stripe', 'Twilio'],
      },
      {
        icon: '\uD83E\uDD16',
        title: 'n8n Agent — AI Workflow Builder',
        description:
          'Autonomous AI agents that design, build, and auto-heal n8n workflows from natural language. Multi-LLM support with web dashboard and CLI.',
        tags: ['Anthropic', 'OpenAI', 'Groq', 'TypeScript', 'PostgreSQL'],
      },
      {
        icon: '\uD83D\uDD0D',
        title: 'ApplySharp — AI Job Assistant',
        description:
          'Local-first Chrome extension that optimizes resumes for specific job descriptions with ATS scoring. All data stays private on your machine.',
        tags: ['React', 'TypeScript', 'Chrome Extension', 'IndexedDB'],
        link: 'https://github.com/Saitata7/apply-sharp',
      },
      {
        icon: '\uD83D\uDEE0\uFE0F',
        title: 'SaaSCode Kit — AI Dev Toolkit',
        description:
          'Published npm toolkit that gives AI coding agents (Claude Code, Cursor, Windsurf) full project context via a single manifest. AST-based code review with ts-morph, 17-category file validation, endpoint parity checking, pre-commit/pre-push gates, and auto-generated IDE context files.',
        tags: ['TypeScript', 'ts-morph', 'Semgrep', 'npm', 'GitHub Actions'],
        link: 'https://github.com/Saitata7/saascode-kit',
      },
      {
        icon: '\uD83D\uDCDE',
        title: 'AWS Connect IVR System',
        description:
          'Intelligent IVR for credit card contact centers using Amazon Lex NLU, with customer validation, language selection, and smart queue routing.',
        tags: ['Amazon Connect', 'Lex', 'Lambda', 'DynamoDB'],
        link: 'https://github.com/Saitata7/Flow-app-aws-connect',
      },
    ],
  },

  /* ─── SKILLS ─── */
  skills: {
    label: 'Stack',
    title: 'What powers the work',
    description: 'The languages, frameworks, and platforms I reach for daily.',
    items: [
      'Python', 'TypeScript', 'Java',
      'React', 'Next.js', 'NestJS',
      'Spring Boot', 'FastAPI', 'Flask',
      'OpenAI API', 'Claude API', 'LangChain',
      'Hugging Face', 'TensorFlow', 'PyTorch',
      'AWS', 'SageMaker', 'Lambda',
      'PostgreSQL', 'MongoDB', 'Redis',
      'Docker', 'Kubernetes', 'CI/CD',
      'Vapi AI', 'Prisma', 'RAG Systems',
    ],
  },

  /* ─── EXPERIENCE ─── */
  experience: {
    label: 'Experience',
    title: 'The road so far',
    items: [
      {
        role: 'Software Engineer \u2022 2026 \u2013 Present',
        company: 'Enterprise Retail',
        description:
          'Optimizing backend database systems with Java and SQL. Achieved 30% reduction in data processing time and 40% faster query execution across production services.',
      },
      {
        role: 'AI/ML Engineer \u2022 2024 \u2013 2025',
        company: 'Healthcare AI',
        description:
          'Built GenAI and LLM solutions using GPT, Claude, and LangChain for healthcare automation — claims processing, fraud detection, clinical decision support, and NLP-driven document intelligence.',
      },
      {
        role: 'Software Engineer \u2022 2023 \u2013 2025',
        company: 'AI Scheduling Platform',
        description:
          'Integrated OpenAI and LangChain APIs for intelligent scheduling recommendations and automated responses. Built React + Spring Boot full-stack with GraphQL APIs and CI/CD on AWS/Azure.',
      },
      {
        role: 'AI/ML Engineer \u2022 2019 \u2013 2022',
        company: 'Enterprise IT',
        description:
          'Designed predictive ML models (XGBoost, CNNs, LSTMs) improving forecasting accuracy by 20%. Built NLP solutions for sentiment analysis, text classification, and anomaly detection at scale.',
      },
    ],
  },

  /* ─── LIVE DEMOS ─── */
  demos: {
    label: 'Demos',
    title: 'See it in action',
    description: 'Hands-on with the AI. More demos dropping as projects go live.',
    items: [
      {
        icon: '\uD83C\uDF99\uFE0F',
        title: 'Voice AI Assistant',
        description:
          'Call the AI receptionist and try booking an appointment, asking about hours, or switching languages.',
        tags: ['Voice AI', 'Live'],
      },
      {
        icon: '\uD83E\uDD16',
        title: 'AI Workflow Agent',
        description:
          'Describe a workflow in plain English and watch the AI agent design and build it autonomously.',
        tags: ['LLM Agents', 'Coming Soon'],
      },
      {
        icon: '\uD83D\uDCC4',
        title: 'Resume ATS Optimizer',
        description:
          'Paste a job description and your resume to get an instant ATS compatibility score and suggestions.',
        tags: ['AI Tools', 'Coming Soon'],
      },
    ],
  },

  /* ─── CONTACT ─── */
  contact: {
    label: 'Contact',
    title: "Let's build",
    titleHighlight: 'what comes next',
    description:
      "Got an AI problem that needs solving, a product idea, or just want to talk shop \u2014 I'm always up for it.",
    links: [
      { label: '\u2709 Email', href: 'mailto:saitata7@gmail.com' },
      { label: '\u229E GitHub', href: 'https://github.com/Saitata7' },
      { label: 'in LinkedIn', href: 'https://linkedin.com/in/sait007' },
    ],
  },
};

export default portfolioData;
