/**
 * PRODUCT JOURNEY TEMPLATES — SNA Sundaram
 *
 * Each template is derived from the actual ingredient list of that product.
 * Descriptions are preparation-oriented and factually grounded.
 *
 * DO NOT add health claims. Only describe what happens during preparation.
 *
 * Stage structure:
 *   id          — unique identifier
 *   title       — short name shown in the timeline
 *   description — customer-facing sentence about what is happening
 *   emoji       — small visual marker (ingredient or action)
 */

export const JOURNEY_TEMPLATES = {

  // ─── 1. Ulundhu Laddu ───────────────────────────────────────────────────────
  // Ingredients: Black Urad Dal, Dry Ginger, Bridegroom's Rice, Forbidden Rice,
  //              Poongar Rice, Raw Rice, Kaattuyanam Rice, Karungurvai Rice,
  //              Yellow Moong Dal, Cardamom, Naatu Chakkarai, Sesame Oil
  "ulundhu-laddu": {
    title: "From Ingredients to Your Home",
    subtitle: "Follow how your Ulundhu Laddu is carefully prepared before it reaches you.",
    productEmoji: "🫘",
    stages: [
      {
        id: "dal-selected",
        title: "Dal Selected",
        description:
          "Black urad dal and yellow moong dal are carefully selected for your batch.",
        emoji: "🫘",
      },
      {
        id: "heritage-rice-selected",
        title: "Heritage Rice Varieties Selected",
        description:
          "Traditional rice varieties — Bridegroom's Rice, Forbidden Rice, Poongar, Kaattuyanam and Karungurvai — are carefully selected for your batch.",
        emoji: "🌾",
      },
      {
        id: "dal-prepared",
        title: "Dal Prepared",
        description:
          "The urad dal and moong dal are cleaned and prepared before the making process begins.",
        emoji: "🔥",
      },
      {
        id: "rice-prepared",
        title: "Heritage Rice Prepared",
        description:
          "The traditional rice varieties are carefully prepared and readied for the next stage.",
        emoji: "🌾",
      },
      {
        id: "spices-added",
        title: "Dry Ginger & Cardamom Added",
        description:
          "Dry ginger and cardamom are added to the preparation for their warmth and aroma.",
        emoji: "🌿",
      },
      {
        id: "chakkarai-prepared",
        title: "Naatu Chakkarai Prepared",
        description:
          "Traditional naatu chakkarai is prepared and incorporated into the mixture.",
        emoji: "🍯",
      },
      {
        id: "oil-added",
        title: "Sesame Oil Added",
        description:
          "Sesame oil is carefully added to help bring the mixture together.",
        emoji: "🫙",
      },
      {
        id: "laddus-made",
        title: "Laddus Handcrafted",
        description:
          "Your Ulundhu Laddus are carefully shaped in small batches.",
        emoji: "🟤",
      },
      {
        id: "quality-check",
        title: "Final Quality Check",
        description:
          "Your batch has completed its final quality check and is prepared for delivery.",
        emoji: "✨",
      },
    ],
  },

  // ─── 2. Ellu Laddu ──────────────────────────────────────────────────────────
  // Ingredients: Sesame Seeds, Naatu Chakkarai, Sesame Oil
  "ellu-laddu": {
    title: "From Ingredients to Your Home",
    subtitle: "Follow how your Ellu Laddu is carefully prepared before it reaches you.",
    productEmoji: "🌱",
    stages: [
      {
        id: "sesame-selected",
        title: "Sesame Seeds Selected",
        description:
          "Quality sesame seeds are carefully selected for your batch.",
        emoji: "🌱",
      },
      {
        id: "sesame-prepared",
        title: "Sesame Seeds Prepared",
        description:
          "The sesame seeds are cleaned and prepared before the making process begins.",
        emoji: "🔥",
      },
      {
        id: "chakkarai-prepared",
        title: "Naatu Chakkarai Prepared",
        description:
          "Traditional naatu chakkarai is prepared and combined with the sesame mixture.",
        emoji: "🍯",
      },
      {
        id: "oil-added",
        title: "Sesame Oil Added",
        description:
          "Sesame oil is added to bring the ingredients together.",
        emoji: "🫙",
      },
      {
        id: "laddus-made",
        title: "Ellu Laddus Handcrafted",
        description:
          "Your Ellu Laddus are carefully shaped in small batches.",
        emoji: "🟤",
      },
      {
        id: "quality-check",
        title: "Final Quality Check",
        description:
          "Your batch has completed its final quality check and is prepared for delivery.",
        emoji: "✨",
      },
    ],
  },

  // ─── 3. Poondu Halwa ────────────────────────────────────────────────────────
  // Ingredients: Garlic, Honey, Ghee, Ginger
  "poondu-halwa": {
    title: "From Ingredients to Your Home",
    subtitle: "Follow how your Poondu Halwa is carefully prepared before it reaches you.",
    productEmoji: "🧄",
    stages: [
      {
        id: "garlic-selected",
        title: "Fresh Garlic Selected",
        description:
          "Fresh garlic is carefully selected for your batch.",
        emoji: "🧄",
      },
      {
        id: "honey-sourced",
        title: "Pure Honey Sourced",
        description:
          "Pure honey is carefully sourced and prepared for your batch.",
        emoji: "🍯",
      },
      {
        id: "garlic-prepared",
        title: "Garlic Prepared",
        description:
          "The garlic is cleaned and carefully prepared before combining with the other ingredients.",
        emoji: "🧄",
      },
      {
        id: "ginger-added",
        title: "Ginger Added",
        description:
          "Fresh ginger is prepared and added to the batch.",
        emoji: "🌿",
      },
      {
        id: "ghee-added",
        title: "Ghee Added",
        description:
          "Pure ghee is incorporated into the preparation.",
        emoji: "🫙",
      },
      {
        id: "combined",
        title: "Ingredients Combined",
        description:
          "Garlic, honey, ghee and ginger are carefully brought together for your halwa.",
        emoji: "🍯",
      },
      {
        id: "quality-check",
        title: "Final Quality Check",
        description:
          "Your batch goes through a careful quality check before it is prepared for delivery.",
        emoji: "✨",
      },
      {
        id: "ready",
        title: "Ready for You",
        description:
          "Your SNA Sundaram Poondu Halwa is ready to begin its journey to your home.",
        emoji: "📦",
      },
    ],
  },

  // ─── 4. Energy Laddu ────────────────────────────────────────────────────────
  // Ingredients: Finger Millet, Green Gram, Peanut, Sesame Seeds,
  //              Cardamom, Naatu Chakkarai, Sesame Oil
  "energy-laddu": {
    title: "From Ingredients to Your Home",
    subtitle: "Follow how your Energy Laddu is carefully prepared before it reaches you.",
    productEmoji: "🌾",
    stages: [
      {
        id: "ingredients-selected",
        title: "Ingredients Selected",
        description:
          "Finger millet, green gram, peanuts and sesame seeds are carefully selected for your batch.",
        emoji: "🌾",
      },
      {
        id: "ingredients-prepared",
        title: "Ingredients Prepared",
        description:
          "The selected ingredients are cleaned and prepared before the making process begins.",
        emoji: "🔥",
      },
      {
        id: "millet-gram-prepared",
        title: "Finger Millet & Green Gram Prepared",
        description:
          "Finger millet and green gram are carefully prepared to form the foundation of your laddu.",
        emoji: "🌾",
      },
      {
        id: "nuts-seeds-prepared",
        title: "Peanuts & Sesame Seeds Prepared",
        description:
          "Peanuts and sesame seeds are prepared to bring their characteristic texture and nourishment.",
        emoji: "🥜",
      },
      {
        id: "cardamom-added",
        title: "Cardamom Added",
        description:
          "A measured amount of cardamom is added for its familiar aroma and flavour.",
        emoji: "🌿",
      },
      {
        id: "chakkarai-prepared",
        title: "Naatu Chakkarai Prepared",
        description:
          "Traditional naatu chakkarai is prepared and incorporated into your batch.",
        emoji: "🍯",
      },
      {
        id: "oil-added",
        title: "Sesame Oil Added",
        description:
          "Sesame oil is carefully added to bring the ingredients together.",
        emoji: "🫙",
      },
      {
        id: "laddus-made",
        title: "Energy Laddus Made",
        description:
          "The prepared ingredients are combined and carefully shaped into your Energy Laddus.",
        emoji: "🟤",
      },
      {
        id: "quality-check",
        title: "Final Quality Check",
        description:
          "Each batch undergoes a final quality check before it is prepared for delivery.",
        emoji: "✨",
      },
    ],
  },

  // ─── Default fallback (unknown / future products) ────────────────────────────
  default: {
    title: "Your Product's Journey",
    subtitle: "Follow how your SNA Sundaram product is prepared before it reaches you.",
    productEmoji: "🌱",
    stages: [
      {
        id: "ingredients-selected",
        title: "Ingredients Selected",
        description:
          "Your ingredients are being carefully selected and prepared for your batch.",
        emoji: "🌱",
      },
      {
        id: "preparation",
        title: "Preparation Underway",
        description:
          "Your product is currently being prepared with care.",
        emoji: "🔥",
      },
      {
        id: "quality-check",
        title: "Quality Check",
        description:
          "Your product is undergoing its final quality check before packing.",
        emoji: "✨",
      },
      {
        id: "ready",
        title: "Ready for You",
        description:
          "Your SNA Sundaram product is ready to begin its journey to your home.",
        emoji: "📦",
      },
    ],
  },
};
