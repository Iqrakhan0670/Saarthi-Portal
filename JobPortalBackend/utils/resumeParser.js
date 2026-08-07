// utils/resumeParser.js
// Fully offline resume parsing engine — no API keys, no cloud LLMs.
// Uses regex patterns + keyword dictionaries + heuristic section detection.

// ─── Skill Dictionary ─────────────────────────────────────────────────────────
// Grouped for expansion rules and display normalization
const SKILL_DICT = {
  // Languages
  JavaScript: ['javascript', 'js', 'es6', 'es2015', 'es2020', 'ecmascript'],
  TypeScript: ['typescript', 'ts'],
  Python: ['python', 'python3', 'python2'],
  Java: ['java', 'java8', 'java11', 'java17'],
  'C++': ['c++', 'cpp', 'c plus plus'],
  C: [' c ', ' c,', '(c)', 'c language'],
  'C#': ['c#', 'csharp', 'c sharp'],
  PHP: ['php'],
  Go: ['golang', ' go '],
  Rust: ['rust'],
  Ruby: ['ruby', 'ruby on rails'],
  Swift: ['swift'],
  Kotlin: ['kotlin'],
  Dart: ['dart'],
  Scala: ['scala'],
  R: [' r ', 'r language', 'r programming'],
  Bash: ['bash', 'shell script', 'shellscript'],

  // Frontend
  React: ['react', 'reactjs', 'react.js', 'react js'],
  'Next.js': ['next.js', 'nextjs', 'next js'],
  Angular: ['angular', 'angularjs', 'angular.js'],
  'Vue.js': ['vue.js', 'vuejs', 'vue js'],
  Redux: ['redux', 'redux toolkit', 'rtk'],
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3'],
  'Tailwind CSS': ['tailwind', 'tailwindcss'],
  Bootstrap: ['bootstrap'],
  'Material UI': ['material ui', 'mui', 'material-ui'],
  'Ant Design': ['ant design', 'antd'],
  jQuery: ['jquery'],
  SASS: ['sass', 'scss'],
  'Three.js': ['three.js', 'threejs'],

  // Backend
  'Node.js': ['node.js', 'nodejs', 'node js', 'express', 'expressjs'],
  'Express.js': ['express.js', 'expressjs', 'express js'],
  Flask: ['flask'],
  Django: ['django'],
  FastAPI: ['fastapi'],
  Spring: ['spring', 'spring boot', 'springboot'],
  Laravel: ['laravel'],
  GraphQL: ['graphql'],
  REST: ['rest api', 'restful', 'rest'],
  gRPC: ['grpc'],

  // Databases
  MongoDB: ['mongodb', 'mongo'],
  MySQL: ['mysql'],
  PostgreSQL: ['postgresql', 'postgres'],
  SQLite: ['sqlite'],
  Redis: ['redis'],
  Firebase: ['firebase'],
  Elasticsearch: ['elasticsearch', 'elastic search'],
  Cassandra: ['cassandra'],
  DynamoDB: ['dynamodb'],
  Supabase: ['supabase'],

  // DevOps & Cloud
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws', 'amazon web services'],
  GCP: ['gcp', 'google cloud', 'google cloud platform'],
  Azure: ['azure', 'microsoft azure'],
  CI_CD: ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'github actions', 'jenkins', 'gitlab ci'],
  Nginx: ['nginx'],
  Linux: ['linux', 'ubuntu', 'debian', 'centos'],
  Terraform: ['terraform'],
  Ansible: ['ansible'],

  // Data & ML
  TensorFlow: ['tensorflow'],
  PyTorch: ['pytorch'],
  'Scikit-learn': ['sklearn', 'scikit-learn', 'scikit learn'],
  Pandas: ['pandas'],
  NumPy: ['numpy'],
  Matplotlib: ['matplotlib'],
  Jupyter: ['jupyter', 'jupyter notebook'],
  OpenCV: ['opencv'],
  'Machine Learning': ['machine learning', 'ml'],
  'Deep Learning': ['deep learning', 'dl'],
  NLP: ['nlp', 'natural language processing'],
  'Data Science': ['data science', 'data scientist'],
  'Data Analysis': ['data analysis', 'data analyst'],

  // Mobile
  'React Native': ['react native'],
  Flutter: ['flutter'],
  Android: ['android'],
  iOS: ['ios', 'xcode'],

  // Tools
  Git: ['git', 'github', 'gitlab', 'bitbucket'],
  Postman: ['postman'],
  Figma: ['figma'],
  Jira: ['jira'],
  Webpack: ['webpack'],
  Vite: ['vite'],
  ESLint: ['eslint'],
  Jest: ['jest'],
  Mocha: ['mocha'],
  Cypress: ['cypress'],
  Selenium: ['selenium'],

  // Blockchain
  Solidity: ['solidity'],
  Web3: ['web3', 'web3.js'],
  Ethereum: ['ethereum'],
};

// Expansion rules: if a term is found, add extra skills
const EXPANSION_RULES = {
  'mern': ['MongoDB', 'Express.js', 'React', 'Node.js'],
  'mern stack': ['MongoDB', 'Express.js', 'React', 'Node.js'],
  'mean': ['MongoDB', 'Express.js', 'Angular', 'Node.js'],
  'mean stack': ['MongoDB', 'Express.js', 'Angular', 'Node.js'],
  'lamp': ['Linux', 'MySQL', 'PHP'],
  'full stack developer': ['JavaScript', 'HTML', 'CSS'],
  'frontend developer': ['HTML', 'CSS', 'JavaScript'],
  'backend developer': ['Node.js', 'REST'],
  'mobile developer': ['React Native'],
  'devops': ['Docker', 'CI_CD', 'Linux'],
  'data scientist': ['Python', 'Machine Learning', 'Pandas', 'NumPy'],
  'ml engineer': ['Python', 'Machine Learning', 'TensorFlow'],
  'android developer': ['Android', 'Java', 'Kotlin'],
  'ios developer': ['iOS', 'Swift'],
};

// ─── Section Heading Patterns ─────────────────────────────────────────────────
const SECTION_PATTERNS = {
  contact:      /\b(contact|personal info|personal details|reach me|get in touch)\b/i,
  summary:      /\b(summary|profile|about|objective|overview|career objective|professional summary)\b/i,
  skills:       /\b(skills|technical skills|core competencies|technologies|tech stack|expertise|tools & technologies)\b/i,
  education:    /\b(education|academic|qualification|academics|educational background|degrees?)\b/i,
  experience:   /\b(experience|employment|work history|professional experience|career history|work experience)\b/i,
  projects:     /\b(projects?|personal projects?|academic projects?|key projects?|notable projects?)\b/i,
  certifications:/\b(certifications?|certificates?|credentials?|licen[sc]es?|achievements?|awards?)\b/i,
  languages:    /\b(languages?|language proficiency|spoken languages?)\b/i,
  internships:  /\b(internships?|trainings?|internship experience)\b/i,
};

// ─── Regex Patterns ───────────────────────────────────────────────────────────
const REGEX = {
  email:    /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/,
  phone:    /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3,5}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/,
  linkedin: /(?:linkedin\.com\/in\/)([\w\-]+)/i,
  github:   /(?:github\.com\/)([\w\-]+)/i,
  year:     /\b(19|20)\d{2}\b/g,
  yearRange:/\b((?:19|20)\d{2})\s*[-–—to]+\s*((?:19|20)\d{2}|present|current|now)\b/gi,
  dateRange:/\b([A-Za-z]+\.?\s+(?:19|20)\d{2})\s*[-–—to]+\s*([A-Za-z]+\.?\s+(?:19|20)\d{2}|present|current|now)\b/gi,
};

// ─── Degree Keywords ──────────────────────────────────────────────────────────
const DEGREE_KEYWORDS = [
  "bachelor", "b.e.", "b.tech", "btech", "be ", "b.sc", "bsc", "b.com", "bcom",
  "b.a.", "ba ", "master", "m.e.", "m.tech", "mtech", "me ", "m.sc", "msc",
  "m.com", "mcom", "m.a.", "ma ", "mba", "phd", "ph.d", "doctorate",
  "diploma", "associate", "b.ca", "bca", "mca", "b.cs", "bs ", "ms ",
  "bachelor of", "master of", "doctor of",
];

// ─── Language Keywords ────────────────────────────────────────────────────────
const KNOWN_LANGUAGES = [
  'english', 'hindi', 'french', 'spanish', 'german', 'mandarin', 'japanese',
  'arabic', 'portuguese', 'russian', 'italian', 'korean', 'bengali', 'urdu',
  'telugu', 'tamil', 'marathi', 'gujarati', 'kannada', 'malayalam', 'punjabi',
  'dutch', 'swedish', 'norwegian', 'danish', 'polish', 'turkish', 'thai',
  'vietnamese', 'greek', 'hebrew', 'swahili', 'indonesian', 'malay',
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function extractEmail(text) {
  const m = text.match(REGEX.email);
  return m ? m[0].toLowerCase() : null;
}

export function extractPhone(text) {
  const m = text.match(REGEX.phone);
  return m ? m[0].replace(/\s+/g, ' ').trim() : null;
}

export function extractLinkedIn(text) {
  const m = text.match(REGEX.linkedin);
  return m ? `https://linkedin.com/in/${m[1]}` : null;
}

export function extractGitHub(text) {
  const m = text.match(REGEX.github);
  return m ? `https://github.com/${m[1]}` : null;
}

// Common words that appear in institution names / job titles but NOT human names
const NON_NAME_WORDS = [
  'university', 'college', 'institute', 'school', 'academy', 'polytechnic',
  'iit', 'iim', 'nit', 'bits', 'ltd', 'pvt', 'inc', 'corp', 'llc', 'technologies',
  'solutions', 'systems', 'services', 'consulting', 'enterprises', 'group',
  'developer', 'engineer', 'designer', 'manager', 'analyst', 'architect',
  'intern', 'executive', 'officer', 'coordinator', 'specialist', 'associate',
  'foundation', 'hospital', 'clinic', 'lab', 'laboratories', 'research',
  'management', 'marketing', 'finance', 'sales', 'operations',
  'resume', 'curriculum', 'vitae', 'cv', 'portfolio',
  'objective', 'summary', 'profile', 'contact', 'address',
  'mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 'pune', 'kolkata',
  'india', 'usa', 'uk', 'canada', 'australia',
];

/**
 * Heuristic name extraction:
 * - Scans only the first 5 non-blank lines (name is always near the top)
 * - Matches 2–4 words, all title-cased or all-caps
 * - Rejects lines containing institution/org/title keywords
 * - Rejects lines with email / URL / phone digits / special chars
 */
export function extractName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 8)) {
    // Skip lines with email / URL / digits beyond 3 consecutive / special chars
    if (/@|https?:\/\/|www\.|[\/\\|_#$%^&*(){}\[\]]/.test(line)) continue;
    if (/\d{3,}/.test(line)) continue;          // phone numbers / zip codes
    if (line.length > 60) continue;             // long lines are not names
    if (line.length < 3) continue;              // too short

    const lowerLine = line.toLowerCase();

    // Skip if any institution/org/title word is present
    if (NON_NAME_WORDS.some(w => lowerLine.includes(w))) continue;
    // Skip section headings
    if (Object.values(SECTION_PATTERNS).some(p => p.test(line))) continue;
    // Skip lines that look like degree lines
    if (DEGREE_KEYWORDS.some(kw => lowerLine.includes(kw))) continue;

    // Normalize: if the line is ALL CAPS, convert to title case for matching
    const normalized = line === line.toUpperCase()
      ? line.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      : line;

    const words = normalized.split(/\s+/);
    if (words.length < 1 || words.length > 5) continue;

    // Each word should be title-cased, ALL CAPS short abbrev, hyphenated, or single initial
    const looksLikeName = words.every(w =>
      /^[A-Z][a-z]{1,}$/.test(w) ||           // Title Case: "Yashvi"
      /^[A-Z]{1,5}$/.test(w) ||               // ALL CAPS or initials: "KP", "A"
      /^[A-Z][a-z]+-[A-Z][a-z]+$/.test(w) || // Hyphenated: "Anne-Marie"
      /^[A-Z]\.$/.test(w)                     // Abbreviated initial: "J."
    );

    if (looksLikeName && words.length >= 2) {
      // Return the original-casing version (title-cased if it was all-caps)
      return normalized;
    }
  }
  return null;
}

// Common city names to detect as location anchors
const KNOWN_CITIES = [
  'mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru', 'chennai', 'hyderabad', 'pune', 'kolkata',
  'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal',
  'visakhapatnam', 'vizag', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik',
  'faridabad', 'meerut', 'rajkot', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad',
  'coimbatore', 'madurai', 'tiruchirappalli', 'trichy', 'kochi', 'thiruvananthapuram',
  'bhubaneswar', 'cuttack', 'raipur', 'ranchi', 'guwahati', 'mysore', 'mysuru',
  'noida', 'gurugram', 'gurgaon', 'navi mumbai', 'thane', 'pimpri', 'navi',
  'new york', 'san francisco', 'los angeles', 'chicago', 'houston', 'london', 'toronto',
  'singapore', 'dubai', 'berlin', 'sydney', 'melbourne', 'amsterdam', 'seattle', 'boston',
];

// Known Indian state names to validate state values
const KNOWN_STATES = [
  'maharashtra', 'karnataka', 'tamil nadu', 'telangana', 'andhra pradesh', 'kerala',
  'gujarat', 'rajasthan', 'uttar pradesh', 'madhya pradesh', 'west bengal', 'bihar',
  'punjab', 'haryana', 'delhi', 'goa', 'odisha', 'jharkhand', 'chhattisgarh',
  'assam', 'himachal pradesh', 'uttarakhand', 'jammu', 'kashmir', 'manipur',
  'meghalaya', 'nagaland', 'tripura', 'sikkim', 'arunachal pradesh', 'mizoram',
  // Abbreviations
  'mh', 'ka', 'tn', 'ts', 'ap', 'kl', 'gj', 'rj', 'up', 'mp', 'wb', 'br',
  // International
  'california', 'new york', 'texas', 'florida', 'washington', 'ontario', 'bc',
];

/**
 * Extract location (city, state/country).
 * ONLY uses known city/state lookups — never falls back to generic "Word, Word"
 * patterns, which falsely match skill names (e.g. "Redux, Tailwind").
 * Returns null if no recognised location is found so fields stay blank.
 */
export function extractLocation(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Only scan the header area (first 20 lines) for a known city
  for (const line of lines.slice(0, 20)) {
    const lower = line.toLowerCase();
    // Skip lines that look like org/institution/degree/skill content
    if (NON_NAME_WORDS.some(w => lower.includes(w))) continue;
    if (DEGREE_KEYWORDS.some(kw => lower.includes(kw))) continue;
    // Skip lines with email or URL
    if (/@|https?:\/\/|www\./.test(line)) continue;
    // Skip lines with 4+ digit numbers (years, phones, zip codes)
    if (/\d{4,}/.test(line)) continue;

    for (const city of KNOWN_CITIES) {
      if (lower.includes(city)) {
        // Try to capture "City, State" but only if state is a recognised word
        const cityIdx = lower.indexOf(city);
        const rest = line.slice(cityIdx);
        const commaMatch = rest.match(/^([^,\n]+)(?:,\s*([^,\n]+))?/);
        if (commaMatch) {
          const cityPart = commaMatch[1].trim();
          const statePart = (commaMatch[2] || '').trim();
          const stateLower = statePart.toLowerCase().replace(/[^a-z\s]/g, '').trim();
          // Only append state if it's a known state/country name — never a skill name
          const validState = statePart &&
            (KNOWN_STATES.some(s => stateLower === s || stateLower.includes(s)) ||
             ['india', 'usa', 'uk', 'us', 'canada', 'australia'].includes(stateLower));
          return validState
            ? `${cityPart}, ${statePart}`.slice(0, 100)
            : cityPart.slice(0, 100);
        }
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }
  }

  // No known city found → return null so city/state fields stay blank
  return null;
}

// ─── Skill Matching ───────────────────────────────────────────────────────────

export function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = new Set();

  // Check expansion rules first
  for (const [trigger, expansions] of Object.entries(EXPANSION_RULES)) {
    if (lower.includes(trigger)) {
      expansions.forEach(s => found.add(s));
    }
  }

  // Match against skill dictionary
  for (const [canonicalName, aliases] of Object.entries(SKILL_DICT)) {
    for (const alias of aliases) {
      if (lower.includes(alias.toLowerCase())) {
        found.add(canonicalName);
        break;
      }
    }
  }

  // Remove raw 'CI_CD' key artifact — normalize it
  if (found.has('CI_CD')) {
    found.delete('CI_CD');
    found.add('CI/CD');
  }

  return [...found];
}

// ─── Section Detection ────────────────────────────────────────────────────────

/**
 * Splits the raw resume text into named sections based on heading keywords.
 * Returns an object: { sectionName: sectionText, ... }
 */
export function detectSections(text) {
  const lines = text.split('\n');
  const sections = { raw: text };
  let currentSection = 'header';
  let buffer = [];

  for (const line of lines) {
    const trimmed = line.trim();
    let matched = false;

    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      // A line is a heading if it matches the pattern AND is short
      if (pattern.test(trimmed) && trimmed.length < 60) {
        // Save previous buffer
        if (buffer.length > 0) {
          sections[currentSection] = (sections[currentSection] || '') + buffer.join('\n');
          buffer = [];
        }
        currentSection = name;
        matched = true;
        break;
      }
    }

    if (!matched) {
      buffer.push(line);
    }
  }

  // Flush last buffer
  if (buffer.length > 0) {
    sections[currentSection] = (sections[currentSection] || '') + buffer.join('\n');
  }

  return sections;
}

// ─── Education Parsing ────────────────────────────────────────────────────────

function parseDegree(line) {
  const lower = line.toLowerCase();
  return DEGREE_KEYWORDS.find(kw => lower.includes(kw)) || null;
}

/**
 * Parse education section into structured records.
 * Heuristic: look for lines containing degree keywords, then associate
 * adjacent lines as institution and year.
 */
export function extractEducation(sectionText) {
  if (!sectionText) return [];

  const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
  const records = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const degree = parseDegree(line);

    if (degree) {
      const record = {
        degree: line.replace(/\s*[\|\-–,]\s*/g, ' ').trim().slice(0, 150),
        institution: null,
        year: null,
      };

      // Look at adjacent lines for institution and year
      const context = lines.slice(Math.max(0, i - 1), i + 3).join(' ');
      const years = context.match(REGEX.year);
      if (years) record.year = years[years.length - 1]; // take the later year (graduation)

      // Institution is often the next line or same line after separator
      if (i + 1 < lines.length && !parseDegree(lines[i + 1])) {
        record.institution = lines[i + 1].trim().slice(0, 200);
      }

      records.push(record);
    }
    i++;
  }

  // Deduplicate by degree
  const seen = new Set();
  return records.filter(r => {
    const key = (r.degree || '').slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Experience Parsing ───────────────────────────────────────────────────────

/**
 * Heuristic experience extraction:
 * - Looks for lines containing date ranges (year–year, Month Year – Month Year)
 * - Groups blocks between dates as individual experience entries
 */
export function extractExperience(sectionText) {
  if (!sectionText) return [];

  const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  let current = null;

  // Heuristics to detect if a line is likely a job title / role
  const ROLE_KEYWORDS = [
    'engineer', 'developer', 'designer', 'analyst', 'manager', 'intern',
    'consultant', 'architect', 'lead', 'director', 'officer', 'specialist',
    'coordinator', 'associate', 'executive', 'scientist', 'researcher',
    'administrator', 'head', 'vp', 'president', 'cto', 'ceo', 'cfo',
  ];

  const looksLikeRole = (line) => {
    const lower = line.toLowerCase();
    return ROLE_KEYWORDS.some(kw => lower.includes(kw));
  };

  // Company indicators: Ltd, Pvt, Inc, Technologies, Solutions, etc.
  const COMPANY_KEYWORDS = [
    'ltd', 'pvt', 'inc', 'corp', 'llc', 'technologies', 'solutions',
    'systems', 'services', 'consulting', 'group', 'labs', 'studio',
    'software', 'digital', 'tech', 'it ', 'infosys', 'wipro', 'tcs', 'hcl',
  ];

  const looksLikeCompany = (line) => {
    const lower = line.toLowerCase();
    return COMPANY_KEYWORDS.some(kw => lower.includes(kw));
  };

  for (const line of lines) {
    const dateMatch = line.match(/\b((?:19|20)\d{2})\b.*?(?:[-–—to]+\s*)?((?:19|20)\d{2}|present|current|now)/i);
    // Also catch lines like "Jan 2022 – Dec 2023"
    const monthDateMatch = line.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(?:19|20)\d{2}/i);
    const hasDate = !!(dateMatch || (monthDateMatch && line.length < 100));

    if (hasDate && line.length < 150) {
      // Save previous entry
      if (current) entries.push(current);
      current = {
        company: null,
        role: null,
        duration: line,
        responsibilities: [],
      };
    } else if (current) {
      const isShortLine = line.length < 120;
      if (isShortLine && !current.role && !current.company) {
        // First non-date line: assign to role or company based on content
        if (looksLikeRole(line)) {
          current.role = line;
        } else if (looksLikeCompany(line)) {
          current.company = line;
        } else {
          // Default: first short line is the role/position
          current.role = line;
        }
      } else if (isShortLine && (current.role && !current.company)) {
        // Second short line: assign to company
        if (looksLikeCompany(line) || !looksLikeRole(line)) {
          current.company = line;
        } else {
          // Another role-like line means previous was company, swap
          current.company = current.role;
          current.role = line;
        }
      } else if (isShortLine && (!current.role && current.company)) {
        current.role = line;
      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.length > 40) {
        current.responsibilities.push(line.replace(/^[•\-*]\s*/, '').trim());
      }
    }
  }

  if (current) entries.push(current);

  // Second pass: if date-based splitting didn't work well, try role-based
  if (entries.length === 0) {
    return extractExperienceFallback(sectionText);
  }

  return entries.filter(e => e.role || e.company).slice(0, 10);
}

function extractExperienceFallback(sectionText) {
  // Fallback: split by blank lines and treat each block as an entry
  const blocks = sectionText.split(/\n\n+/).filter(b => b.trim().length > 20);
  return blocks.slice(0, 5).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    return {
      company: lines[1] || null,
      role: lines[0] || null,
      duration: null,
      responsibilities: lines.slice(2).filter(l => l.length > 10),
    };
  });
}

// ─── Project Parsing ──────────────────────────────────────────────────────────

export function extractProjects(sectionText) {
  if (!sectionText) return [];

  const blocks = sectionText.split(/\n\n+/).filter(b => b.trim().length > 10);
  return blocks.slice(0, 8).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const name = lines[0] || 'Untitled Project';
    const description = lines.slice(1).join(' ').slice(0, 500);
    const techStack = extractSkills(description).slice(0, 8);

    return { name, description, techStack };
  }).filter(p => p.name && p.name.length > 2);
}

// ─── Certification Parsing ────────────────────────────────────────────────────

const CERT_KEYWORDS = [
  'certificate', 'certification', 'certified', 'credential',
  'course', 'completed', 'awarded', 'honor', 'award', 'achievement',
  'udemy', 'coursera', 'edx', 'nptel', 'google', 'aws', 'microsoft',
  'cisco', 'comptia', 'oracle', 'salesforce',
];

export function extractCertifications(sectionText, rawText) {
  const text = sectionText || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const certs = lines.filter(line => {
    const lower = line.toLowerCase();
    return CERT_KEYWORDS.some(kw => lower.includes(kw)) && line.length > 5;
  });

  return [...new Set(certs)].slice(0, 15);
}

// ─── Language Extraction ──────────────────────────────────────────────────────

export function extractLanguages(sectionText, rawText) {
  const text = (sectionText || rawText || '').toLowerCase();
  return KNOWN_LANGUAGES.filter(lang => text.includes(lang))
    .map(l => l.charAt(0).toUpperCase() + l.slice(1));
}

// ─── Summary Extraction ───────────────────────────────────────────────────────

export function extractSummary(sections) {
  const summaryText = sections.summary || sections.header || '';
  const lines = summaryText.split('\n').map(l => l.trim()).filter(l => l.length > 30);
  return lines.slice(0, 4).join(' ').slice(0, 1000) || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PARSE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse raw resume text into a structured profile JSON.
 * Fully offline — no API calls.
 * @param {string} rawText - Extracted text from PDF/DOCX
 * @returns {object} structured profile data
 */
export function parseResume(rawText) {
  if (!rawText || rawText.trim().length < 30) {
    throw new Error('Resume text is too short to parse.');
  }

  // Detect sections
  const sections = detectSections(rawText);

  // Run all extractors
  const skills = extractSkills(rawText);

  return {
    name:           extractName(rawText),
    email:          extractEmail(rawText),
    phone:          extractPhone(rawText),
    location:       extractLocation(rawText),
    linkedin:       extractLinkedIn(rawText),
    github:         extractGitHub(rawText),
    summary:        extractSummary(sections),
    skills,
    education:      extractEducation(sections.education),
    experience:     extractExperience(sections.experience || sections.internships),
    projects:       extractProjects(sections.projects),
    certifications: extractCertifications(sections.certifications, rawText),
    languages:      extractLanguages(sections.languages, rawText),
  };
}
