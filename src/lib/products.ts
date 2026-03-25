/**
 * Product catalog — maps item names from order data to rich product info
 * including images, descriptions, and handling details.
 * Source: https://nebraska-seats.raregoods.com/products.json
 */

export interface ProductInfo {
  name: string;
  shortName: string;
  description: string;
  image: string;
  images: string[];
  price: number;
  weight: string;
  handling: string;
  category: 'bench' | 'seat' | 'iron' | 'chairback' | 'ornament' | 'wallmount';
}

const PRODUCTS: ProductInfo[] = [
  {
    name: 'Two Authentic Devaney Seats, Rebuilt as a Collectible Bench - Ready-to-use bench with feet',
    shortName: 'Legacy Bench (with Feet)',
    description: 'Two authentic Devaney arena seats, rebuilt as a collectible bench with custom-designed feet featuring Nebraska \'N\' logos. Ready to display in your home, office, or fan cave.',
    image: 'https://nebraska-seats.raregoods.com/images/nebraska-seat-bench.jpg',
    images: [
      'https://nebraska-seats.raregoods.com/images/nebraska-seat-bench.jpg',
      'https://nebraska-seats.raregoods.com/images/bench-fan-cave.webp',
      'https://nebraska-seats.raregoods.com/images/bench-elegant-home.webp',
      'https://nebraska-seats.raregoods.com/images/bench-home-office.webp',
      'https://nebraska-seats.raregoods.com/images/bench-boys-room.webp',
      'https://nebraska-seats.raregoods.com/images/bench-home-bar.webp',
      'https://nebraska-seats.raregoods.com/images/bench-office.webp',
      'https://nebraska-seats.raregoods.com/images/bench-devaney-floor.webp',
    ],
    price: 595,
    weight: '~80 lbs',
    handling: '2 people required to carry',
    category: 'bench',
  },
  {
    name: 'Two Authentic Devaney Seats, Rebuilt as a Collectible Bench - Seats only, no floor stands',
    shortName: 'Legacy Bench (Seats Only)',
    description: 'Two authentic Devaney arena seats, paired as a bench without floor stands. Requires secure mounting (not included). Includes original padded cushions, armrests, and numbered seat backs.',
    image: 'https://nebraska-seats.raregoods.com/images/nebraska-seat-bench.jpg',
    images: [
      'https://nebraska-seats.raregoods.com/images/nebraska-seat-bench.jpg',
    ],
    price: 459,
    weight: '~60 lbs',
    handling: '2 people required to carry',
    category: 'bench',
  },
  {
    name: 'Premium End-Row Seat Pairs',
    shortName: 'Premium End-Row Seat Pair',
    description: 'Premium end-of-row seating featuring the Nebraska \'N\'. Floor mounted design, sold as pairs only. The highest-end offering from the Bob Devaney Sports Center collection.',
    image: 'https://nebraska-seats.raregoods.com/images/premium-end-row-seat-pair.png',
    images: [
      'https://nebraska-seats.raregoods.com/images/premium-end-row-seat-pair.png',
      'https://nebraska-seats.raregoods.com/images/23-20end-20seats-20with-20n.jpg',
      'https://nebraska-seats.raregoods.com/images/end-20seat-20with-20n-20example-202.jpg',
    ],
    price: 799,
    weight: '~50 lbs per pair',
    handling: '1–2 people recommended',
    category: 'seat',
  },
  {
    name: 'Standard Arena Seats',
    shortName: 'Standard Arena Seat',
    description: 'Authentic game-used seating from the Bob Devaney Sports Center. Standard red steel support. Perfect for home display.',
    image: 'https://nebraska-seats.raregoods.com/images/standard-arena-seat.png',
    images: [
      'https://nebraska-seats.raregoods.com/images/standard-arena-seat.png',
      'https://nebraska-seats.raregoods.com/images/row-20seat-20no-20n.jpg',
    ],
    price: 199,
    weight: '~25 lbs',
    handling: '1 person',
    category: 'seat',
  },
  {
    name: 'Standard Red Wall Mount Seat Pair',
    shortName: 'Red Wall Mount Seat Pair',
    description: 'Classic Husker red arena seats in a wall-mountable design. Space-saving display option sold as pairs.',
    image: 'https://nebraska-seats.raregoods.com/images/standard-arena-seat.png',
    images: [
      'https://nebraska-seats.raregoods.com/images/standard-arena-seat.png',
      'https://nebraska-seats.raregoods.com/images/row-20seat-20no-20n.jpg',
    ],
    price: 299,
    weight: '~30 lbs per pair',
    handling: '1 person',
    category: 'wallmount',
  },
  {
    name: 'Standard Black Wall Mount Seat Pair',
    shortName: 'Black Wall Mount Seat Pair',
    description: 'Sleek black arena seats in a wall-mountable design. Space-saving display option sold as pairs.',
    image: 'https://nebraska-seats.raregoods.com/images/standard-arena-seat.png',
    images: [
      'https://nebraska-seats.raregoods.com/images/standard-arena-seat.png',
    ],
    price: 299,
    weight: '~30 lbs per pair',
    handling: '1 person',
    category: 'wallmount',
  },
  {
    name: "Premium Black Wall Mount Seat Pair with 'N'",
    shortName: "Premium Black Wall Mount (with N)",
    description: "Premium black arena seats featuring the Nebraska 'N' in a wall-mountable design. Authentic end-of-row seating from the Bob Devaney Sports Center.",
    image: 'https://nebraska-seats.raregoods.com/images/premium-end-row-seat-pair.png',
    images: [
      'https://nebraska-seats.raregoods.com/images/premium-end-row-seat-pair.png',
      'https://nebraska-seats.raregoods.com/images/23-20end-20seats-20with-20n.jpg',
      'https://nebraska-seats.raregoods.com/images/end-20seat-20with-20n-20example-202.jpg',
    ],
    price: 499,
    weight: '~35 lbs per pair',
    handling: '1–2 people recommended',
    category: 'wallmount',
  },
  {
    name: 'Iron End-of-Row Side Pieces',
    shortName: 'Iron Side Piece',
    description: "Solid iron end-of-row side piece featuring the Nebraska 'N'. A substantial statement decor piece weighing 15 lbs. Industrial memorabilia from decades of Devaney history.",
    image: 'https://nebraska-seats.raregoods.com/images/iron-side-piece.png',
    images: [
      'https://nebraska-seats.raregoods.com/images/iron-side-piece.png',
      'https://nebraska-seats.raregoods.com/images/iron-side-piece.jpg',
      'https://nebraska-seats.raregoods.com/images/end-20of-20row-20metal-20piece-20no-20seat.jpg',
    ],
    price: 199,
    weight: '15 lbs',
    handling: '1 person',
    category: 'iron',
  },
  {
    name: 'Devaney Numbered Chair Backs',
    shortName: 'Numbered Chair Back',
    description: 'Individually numbered chair back from the Bob Devaney Sports Center. The most accessible piece of Devaney history — perfect for gifting or starting your collection.',
    image: 'https://nebraska-seats.raregoods.com/images/numbered-chair-back-composite.png',
    images: [
      'https://nebraska-seats.raregoods.com/images/numbered-chair-back-composite.png',
      'https://nebraska-seats.raregoods.com/images/numbered-chair-back.jpg',
    ],
    price: 49,
    weight: '2 lbs',
    handling: '1 person',
    category: 'chairback',
  },
];

/**
 * Look up product info by item name from order data.
 * Uses fuzzy matching since order data item names may vary slightly.
 */
export function getProductInfo(itemName: string): ProductInfo | null {
  // Exact match first
  const exact = PRODUCTS.find(p => p.name === itemName);
  if (exact) return exact;

  // Fuzzy match by keywords
  const lower = itemName.toLowerCase();

  if (lower.includes('bench') && lower.includes('feet')) return PRODUCTS[0];
  if (lower.includes('bench') && (lower.includes('seats only') || lower.includes('no floor'))) return PRODUCTS[1];
  if (lower.includes('bench')) return PRODUCTS[0]; // Default bench

  if (lower.includes('premium') && lower.includes('end') && lower.includes('row')) return PRODUCTS[2];
  if (lower.includes('premium') && lower.includes('black') && lower.includes('wall')) return PRODUCTS[6];

  if (lower.includes('standard') && lower.includes('red') && lower.includes('wall')) return PRODUCTS[4];
  if (lower.includes('standard') && lower.includes('black') && lower.includes('wall')) return PRODUCTS[5];
  if (lower.includes('wall mount')) return PRODUCTS[4]; // Default wall mount

  if (lower.includes('standard') && lower.includes('arena')) return PRODUCTS[3];
  if (lower.includes('arena seat')) return PRODUCTS[3];

  if (lower.includes('iron') || lower.includes('side piece')) return PRODUCTS[7];
  if (lower.includes('chair back') || lower.includes('chairback')) return PRODUCTS[8];

  return null;
}

/**
 * Get the primary category color scheme for a product category
 */
export function getCategoryColor(category: ProductInfo['category']): string {
  switch (category) {
    case 'bench': return 'border-amber-300 bg-amber-50';
    case 'seat': return 'border-blue-300 bg-blue-50';
    case 'iron': return 'border-gray-300 bg-gray-50';
    case 'chairback': return 'border-red-300 bg-red-50';
    case 'wallmount': return 'border-indigo-300 bg-indigo-50';
    case 'ornament': return 'border-green-300 bg-green-50';
  }
}
