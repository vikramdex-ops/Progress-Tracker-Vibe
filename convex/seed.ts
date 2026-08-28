import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const BADGES_DATA = [
  // Submission badges
  { name: "First Entry", icon: "🌱", description: "Submit your first EOD entry", category: "submission" as const, criteriaType: "total_entries", criteriaValue: 1, xpReward: 10 },
  { name: "3-Day Streak", icon: "🔥", description: "Maintain a 3-day streak", category: "streak" as const, criteriaType: "current_streak", criteriaValue: 3, xpReward: 15 },
  { name: "7-Day Streak", icon: "🔥🔥", description: "Maintain a 7-day streak", category: "streak" as const, criteriaType: "current_streak", criteriaValue: 7, xpReward: 30 },
  { name: "30-Day Streak", icon: "💎", description: "Maintain a 30-day streak", category: "streak" as const, criteriaType: "longest_streak", criteriaValue: 30, xpReward: 100 },
  { name: "50 Entries", icon: "🏅", description: "Submit 50 EOD entries", category: "submission" as const, criteriaType: "total_entries", criteriaValue: 50, xpReward: 25 },
  { name: "100 Entries", icon: "🏆", description: "Submit 100 EOD entries", category: "submission" as const, criteriaType: "total_entries", criteriaValue: 100, xpReward: 50 },
  // Productivity badges
  { name: "100% Planned", icon: "🎯", description: "Complete 100% of planned work", category: "productivity" as const, criteriaType: "total_entries", criteriaValue: 5, xpReward: 10 },
  { name: "Early Bird", icon: "⚡", description: "Submit before 5 PM consistently", category: "productivity" as const, criteriaType: "total_entries", criteriaValue: 10, xpReward: 15 },
  { name: "High Output", icon: "🚀", description: "Achieve high output consistently", category: "productivity" as const, criteriaType: "total_entries", criteriaValue: 20, xpReward: 20 },
  { name: "Consistent Performer", icon: "📊", description: "Submit entries consistently", category: "productivity" as const, criteriaType: "total_entries", criteriaValue: 30, xpReward: 20 },
  // Knowledge badges
  { name: "Knowledge Contributor", icon: "💡", description: "Answer knowledge questions", category: "knowledge" as const, criteriaType: "knowledge_points", criteriaValue: 25, xpReward: 10 },
  { name: "Problem Solver", icon: "🛠", description: "Reach 50 knowledge points", category: "knowledge" as const, criteriaType: "knowledge_points", criteriaValue: 50, xpReward: 20 },
  // Team badges
  { name: "Team Player", icon: "🤝", description: "Recognize your teammates", category: "team" as const, criteriaType: "total_entries", criteriaValue: 15, xpReward: 10 },
  // Level badges
  { name: "Level 5 Expert", icon: "⭐", description: "Reach Level 5", category: "productivity" as const, criteriaType: "level", criteriaValue: 5, xpReward: 30 },
  { name: "Level 10 Wizard", icon: "🧙", description: "Reach Level 10", category: "productivity" as const, criteriaType: "level", criteriaValue: 10, xpReward: 100 },
];

const KNOWLEDGE_DATA = [
  { title: "What is the purpose of an isometric drawing in piping?", content: "Isometric drawings provide a 3D representation of piping systems on a 2D plane, showing the exact routing, dimensions, and component locations for fabrication and installation.", category: "isometrics" as const, difficulty: "easy" as const, options: ["Show equipment layout", "Show 3D piping routing on 2D plane", "Show electrical connections", "Show structural supports"], correctAnswer: 1, explanation: "Isometric drawings are the primary fabrication documents in piping, showing the three-dimensional routing of pipes on a two-dimensional drawing.", source: "API 570" },
  { title: "What is a pipe spool?", content: "A pipe spool is a pre-fabricated section of piping that is assembled in a shop and then transported to the construction site for installation.", category: "piping_design" as const, difficulty: "easy" as const, options: ["A type of valve", "A pre-fabricated pipe section", "A pipe support", "A welding technique"], correctAnswer: 1, explanation: "Pipe spools are fabricated in controlled shop environments for quality and efficiency, then shipped to site for assembly.", source: "PEB Standards" },
  { title: "What does NPS stand for in piping?", content: "NPS stands for Nominal Pipe Size, which is a North American set of standard sizes for pipes used for high or low pressure and temperature applications.", category: "materials" as const, difficulty: "easy" as const, options: ["National Pipe Standard", "Nominal Pipe Size", "New Pipe System", "Normal Pressure Standard"], correctAnswer: 1, explanation: "NPS is a dimensionless number that loosely relates to the inside diameter in inches, but the actual OD may differ.", source: "ASME B36.10M" },
  { title: "What is the difference between a gate valve and a globe valve?", content: "Gate valves provide minimal flow restriction when fully open, while globe valves are designed for flow regulation but create higher pressure drop.", category: "piping_design" as const, difficulty: "medium" as const, options: ["Gate valves regulate flow, globe valves isolate", "Gate valves isolate, globe valves regulate flow", "Both are identical", "Gate valves are only for steam"], correctAnswer: 1, explanation: "Gate valves are primarily for on/off isolation while globe valves are designed for throttling and flow regulation.", source: "Machinery's Handbook" },
  { title: "What is the purpose of a pipe stress analysis?", content: "Pipe stress analysis ensures that piping systems can safely withstand all loads including thermal expansion, pressure, weight, and dynamic forces.", category: "process" as const, difficulty: "medium" as const, options: ["To calculate pipe weight", "To verify piping can handle all operational loads", "To determine pipe color codes", "To select pipe insulation"], correctAnswer: 1, explanation: "Stress analysis is critical for ensuring piping integrity under all operating conditions, per codes like ASME B31.3.", source: "ASME B31.3" },
  { title: "What is a P&ID?", content: "A Piping and Instrumentation Diagram (P&ID) shows the piping, equipment, instruments, and control interconnections of a process.", category: "general" as const, difficulty: "easy" as const, options: ["Process and Infrastructure Document", "Piping and Instrumentation Diagram", "Pipe Inspection Document", "Pressure and Installation Design"], correctAnswer: 1, explanation: "P&IDs are fundamental documents in process plants showing all process and control relationships.", source: "ISA-5.1" },
  { title: "What is a pipe support?", content: "Pipe supports are devices that transfer the load from a pipe to the supporting structure, controlling the line's weight, movement, and vibration.", category: "piping_design" as const, difficulty: "easy" as const, options: ["A type of gasket", "A device to support and restrain pipes", "A welding tool", "A pressure testing device"], correctAnswer: 1, explanation: "Pipe supports include guides, anchors, hangers, and rests that manage pipe loads and thermal movement.", source: "MSS SP-69" },
  { title: "What is the significance of the ASME B31.3 code?", content: "ASME B31.3 is the Process Piping code that provides requirements for design, materials, fabrication, assembly, erection, examination, inspection, and testing of piping systems.", category: "code_compliance" as const, difficulty: "medium" as const, options: ["Covers structural steel design", "Covers process piping requirements", "Covers electrical wiring", "Covers HVAC systems"], correctAnswer: 1, explanation: "ASME B31.3 is the primary code governing process piping in refineries, chemical plants, and other process facilities.", source: "ASME B31.3" },
  { title: "What is a flange face finish?", content: "Flange face finish refers to the surface roughness of the sealing face of a flange, which must be compatible with the gasket type being used.", category: "materials" as const, difficulty: "hard" as const, options: ["The color of the flange", "The surface roughness of the sealing face", "The thickness of the flange", "The bolt pattern"], correctAnswer: 1, explanation: "Flange face finish is critical for gasket sealing. Different gasket types require different finish grades (e.g., smooth, stock, serrated).", source: "ASME B16.5" },
  { title: "What is a thermal expansion loop?", content: "A thermal expansion loop is a U-shaped piping configuration that absorbs thermal expansion and contraction of the piping system.", category: "piping_design" as const, difficulty: "medium" as const, options: ["A type of gasket seal", "A U-shaped pipe section for thermal movement", "A testing loop", "A cleaning procedure"], correctAnswer: 1, explanation: "Expansion loops are critical in long piping runs to accommodate thermal growth without overstressing the pipe or connections.", source: "ASME B31.3" },
  { title: "What does PWHT stand for?", content: "PWHT stands for Post Weld Heat Treatment, a process used to reduce residual stresses and improve the metallurgical properties of welded joints.", category: "code_compliance" as const, difficulty: "medium" as const, options: ["Pre-Weld Heat Testing", "Post Weld Heat Treatment", "Pipe Welding High Temperature", "Pressure Welding Heat Test"], correctAnswer: 1, explanation: "PWHT is required by codes for certain materials and thicknesses to prevent stress corrosion cracking and improve ductility.", source: "ASME B31.3" },
  { title: "What is a pipe class?", content: "A pipe class is a document that defines the materials, dimensions, ratings, and specifications for piping components within a specific service.", category: "piping_design" as const, difficulty: "easy" as const, options: ["A pipe category by size", "A specification document for piping components", "A type of pipe support", "A pipe cleaning method"], correctAnswer: 1, explanation: "Pipe classes standardize material selection for different services, temperatures, and pressures in a project.", source: "Project Standards" },
  { title: "What is an NDE?", content: "NDE stands for Non-Destructive Examination, which includes methods like radiography, ultrasonic testing, magnetic particle, and dye penetrant testing.", category: "code_compliance" as const, difficulty: "easy" as const, options: ["New Design Equipment", "Non-Destructive Examination", "National Design Engine", "Normal Density Evaluation"], correctAnswer: 1, explanation: "NDE methods allow inspection of welds and materials without damaging the component.", source: "ASME V" },
  { title: "What is a bellows expansion joint?", content: "A bellows expansion joint is a flexible element made of thin-walled metallic material that absorbs thermal expansion, vibration, and misalignment in piping systems.", category: "materials" as const, difficulty: "hard" as const, options: ["A type of pipe support", "A flexible metallic element for thermal absorption", "A gasket type", "A valve component"], correctAnswer: 1, explanation: "Bellows joints are used when expansion loops are not practical due to space constraints.", source: "EJMA Standards" },
  { title: "What is a pipe spec break?", content: "A pipe spec break is a transition point where the piping specification changes, typically requiring different materials, ratings, or connection types.", category: "piping_design" as const, difficulty: "hard" as const, options: ["A pipe breaking point", "A transition between piping specifications", "A pressure relief point", "A pipe cleaning point"], correctAnswer: 1, explanation: "Spec breaks require careful design to ensure proper transition between different piping classes.", source: "Project Standards" },
];

const HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day", type: "holiday" as const },
  { date: "2026-01-26", name: "Republic Day", type: "holiday" as const },
  { date: "2026-03-10", name: "Holi", type: "holiday" as const },
  { date: "2026-03-30", name: "Ugadi", type: "holiday" as const },
  { date: "2026-04-02", name: "Ram Navami", type: "holiday" as const },
  { date: "2026-04-14", name: "Ambedkar Jayanti", type: "holiday" as const },
  { date: "2026-04-15", name: "Vaisakhi", type: "holiday" as const },
  { date: "2026-05-01", name: "May Day", type: "holiday" as const },
  { date: "2026-08-15", name: "Independence Day", type: "holiday" as const },
  { date: "2026-08-27", name: "Janmashtami", type: "holiday" as const },
  { date: "2026-10-02", name: "Gandhi Jayanti", type: "holiday" as const },
  { date: "2026-10-20", name: "Diwali", type: "holiday" as const },
  { date: "2026-11-14", name: "Children's Day", type: "holiday" as const },
  { date: "2026-11-25", name: "Guru Nanak Jayanti", type: "holiday" as const },
  { date: "2026-12-25", name: "Christmas", type: "holiday" as const },
];

const PROJECTS_DATA = [
  { name: "ISO Checking", code: "ISO", description: "Isometric drawing verification and checking" },
  { name: "3D Modeling", code: "3D", description: "Piping 3D model development in PDMS/SP3D" },
  { name: "Stress Analysis", code: "STR", description: "Pipe stress analysis and support design" },
  { name: "Material Take Off", code: "MTO", description: "Material quantity extraction and reconciliation" },
  { name: "Plot Plan", code: "PP", description: "Equipment and piping layout planning" },
];

export const isInitialized = query({
  args: {},
  handler: async (ctx) => {
    const status = await ctx.db.query("seedStatus").first();
    return status?.isInitialized ?? false;
  },
});

export const initializeDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Seed badges
    for (const badge of BADGES_DATA) {
      await ctx.db.insert("badges", {
        ...badge,
        isActive: true,
        xpReward: badge.xpReward,
      });
    }

    // Seed holidays and generate all days for 2026
    const holidayDates = new Set(HOLIDAYS_2026.map((h) => h.date));

    for (const holiday of HOLIDAYS_2026) {
      await ctx.db.insert("calendarDays", {
        date: holiday.date,
        name: holiday.name,
        type: holiday.type,
        eodRequired: false,
      });
    }

    // Generate Sundays and working days for 2026
    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-12-31");

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      if (holidayDates.has(dateStr)) continue; // Already added

      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) {
        await ctx.db.insert("calendarDays", {
          date: dateStr,
          name: "Sunday",
          type: "weekend",
          eodRequired: false,
        });
      } else {
        await ctx.db.insert("calendarDays", {
          date: dateStr,
          name: d.toLocaleDateString("en-IN", { weekday: "long" }),
          type: "working",
          eodRequired: true,
        });
      }
    }

    // Seed knowledge items
    for (const item of KNOWLEDGE_DATA) {
      await ctx.db.insert("knowledge", {
        ...item,
        isActive: true,
        createdAt: now,
      });
    }

    // Seed projects
    for (const project of PROJECTS_DATA) {
      await ctx.db.insert("projects", {
        ...project,
        isActive: true,
        createdAt: now,
      });
    }

    // Mark as initialized
    await ctx.db.insert("seedStatus", {
      key: "initialized",
      isInitialized: true,
      initializedAt: now,
    });

    return "Database initialized successfully with badges, calendar, knowledge, and projects!";
  },
});
