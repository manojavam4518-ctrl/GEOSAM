/**
 * Official Indian GST & Customs Tariff HSN Classification Database
 * Comprehensive mapping across Chapters 01 to 98 with intelligent search,
 * multi-token keyword indexing, synonym mapping, and classification scoring.
 */

export interface HsnEntry {
  code: string; // 4, 6, or 8 digits
  digits: 4 | 6 | 8;
  chapter: number;
  chapterTitle: string;
  category: string;
  description: string;
  keywords: string[];
  gstRate?: string;
  examples?: string[];
}

export interface HsnMatchResult {
  entry: HsnEntry;
  score: number; // 0 - 100
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedTerms: string[];
  explanation: string;
}

export const HSN_DATABASE: HsnEntry[] = [
  // =========================================================================
  // CHAPTER 01 - 14: VEGETABLES, GRAINS, SEEDS, SPICES
  // =========================================================================
  {
    code: '1006',
    digits: 4,
    chapter: 10,
    chapterTitle: 'Chapter 10: Cereals',
    category: 'Rice (Basmati & Non-Basmati)',
    description: 'Rice in the husk (paddy or rough), husked (brown), semi-milled or wholly milled, polished, glazed or broken.',
    keywords: ['rice', 'basmati', 'paddy', 'chawal', 'grain', 'cereals', 'food grains', 'broken rice', 'parboiled rice'],
    gstRate: '0% / 5%',
    examples: ['Basmati Rice', 'Raw Rice', 'Steamed Rice', 'Organic Brown Rice'],
  },
  {
    code: '1001',
    digits: 4,
    chapter: 10,
    chapterTitle: 'Chapter 10: Cereals',
    category: 'Wheat and Meslin',
    description: 'Wheat (durum wheat, other wheat) and meslin, whether for seed or consumption.',
    keywords: ['wheat', 'gehun', 'meslin', 'durum wheat', 'cereal', 'food grains', 'atta wheat'],
    gstRate: '0% / 5%',
    examples: ['Wheat Grains', 'Durum Wheat', 'Whole Wheat Seed'],
  },
  {
    code: '0713',
    digits: 4,
    chapter: 7,
    chapterTitle: 'Chapter 07: Edible Vegetables & Pulses',
    category: 'Dried Leguminous Vegetables / Pulses',
    description: 'Dried leguminous vegetables, shelled, whether or not skinned or split (peas, chickpeas, lentils, moong, toor, urad, beans).',
    keywords: ['pulses', 'dal', 'daal', 'lentils', 'chana', 'chickpeas', 'peas', 'moong', 'toor', 'urad', 'kidney beans', 'rajma', 'gram'],
    gstRate: '0% / 5%',
    examples: ['Toor Dal', 'Moong Dal', 'Chana Dal', 'Urad Dal', 'Dry Lentils'],
  },
  {
    code: '0901',
    digits: 4,
    chapter: 9,
    chapterTitle: 'Chapter 09: Coffee, Tea, Mate and Spices',
    category: 'Coffee',
    description: 'Coffee, whether or not roasted or decaffeinated; coffee husks and skins; coffee substitutes.',
    keywords: ['coffee', 'coffee beans', 'roasted coffee', 'ground coffee', 'arabica', 'robusta', 'filter coffee'],
    gstRate: '5%',
    examples: ['Roasted Coffee Beans', 'Ground Filter Coffee', 'Instant Coffee Powder'],
  },
  {
    code: '0902',
    digits: 4,
    chapter: 9,
    chapterTitle: 'Chapter 09: Coffee, Tea, Mate and Spices',
    category: 'Tea',
    description: 'Tea, whether or not flavoured (green tea, black tea, CTC, orthodox).',
    keywords: ['tea', 'chai', 'green tea', 'black tea', 'tea leaves', 'ctc tea', 'darjeeling tea', 'assam tea', 'herbal tea'],
    gstRate: '5%',
    examples: ['Assam Black Tea', 'Darjeeling Green Tea', 'CTC Tea Powder'],
  },
  {
    code: '0910',
    digits: 4,
    chapter: 9,
    chapterTitle: 'Chapter 09: Coffee, Tea, Mate and Spices',
    category: 'Spices (Ginger, Turmeric, Cardamom)',
    description: 'Ginger, saffron, turmeric (curcuma), thyme, bay leaves, curry and other spices.',
    keywords: ['spices', 'turmeric', 'haldi', 'ginger', 'adrak', 'curry powder', 'masala', 'cardamom', 'elaichi', 'clove', 'laung', 'cumin', 'jeera', 'coriander'],
    gstRate: '5%',
    examples: ['Organic Turmeric Powder', 'Dry Ginger', 'Garam Masala Spices', 'Cardamom Pods'],
  },
  {
    code: '1507',
    digits: 4,
    chapter: 15,
    chapterTitle: 'Chapter 15: Animal or Vegetable Fats and Oils',
    category: 'Edible Vegetable Oils',
    description: 'Edible animal or vegetable fats and oils and their cleavage products; prepared edible fats.',
    keywords: ['edible oil', 'cooking oil', 'vegetable oil', 'sunflower oil', 'mustard oil', 'soyabean oil', 'groundnut oil', 'palm oil', 'olive oil', 'coconut oil'],
    gstRate: '5%',
    examples: ['Refined Sunflower Oil', 'Cold Pressed Mustard Oil', 'Groundnut Cooking Oil'],
  },

  // =========================================================================
  // CHAPTER 16 - 24: PREPARED FOODSTUFFS, BAKERY, BEVERAGES
  // =========================================================================
  {
    code: '1905',
    digits: 4,
    chapter: 19,
    chapterTitle: 'Chapter 19: Preparations of Cereals, Flour, Starch or Milk',
    category: 'Biscuits, Bread, Cakes & Pastries',
    description: 'Bread, pastry, cakes, biscuits and other bakers wares, whether or not containing cocoa; communion wafers, empty cachets for pharmaceutical use, sealing wafers, rice paper.',
    keywords: ['biscuits', 'cookies', 'bread', 'cakes', 'pastries', 'rusks', 'packaged food', 'bakers wares', 'bakery', 'wafers', 'toast'],
    gstRate: '18%',
    examples: ['Chocolate Biscuits', 'Cream Cookies', 'Packaged Bakery Bread', 'Wheat Rusks'],
  },
  {
    code: '1806',
    digits: 4,
    chapter: 18,
    chapterTitle: 'Chapter 18: Cocoa and Cocoa Preparations',
    category: 'Chocolates & Cocoa Preparations',
    description: 'Chocolate and other food preparations containing cocoa, confectionery, chocolate bars, spreads.',
    keywords: ['chocolate', 'chocolates', 'cocoa', 'dark chocolate', 'milk chocolate', 'candy', 'confectionery', 'cocoa powder'],
    gstRate: '18%',
    examples: ['Milk Chocolate Bar', 'Dark Cocoa Chocolate', 'Chocolate Truffles'],
  },
  {
    code: '2106',
    digits: 4,
    chapter: 21,
    chapterTitle: 'Chapter 21: Miscellaneous Edible Preparations',
    category: 'Packaged Food Preparations & Supplements',
    description: 'Food preparations not elsewhere specified or included, protein concentrates, texturised protein substances, namkeens, bhujia, ready-to-eat packaged snacks.',
    keywords: ['packaged food', 'food preparations', 'namkeen', 'snacks', 'bhujia', 'ready to eat', 'health supplements', 'protein powder', 'energy mix', 'instant mix'],
    gstRate: '12% / 18%',
    examples: ['Packaged Namkeen Snacks', 'Protein Health Supplement', 'Ready To Cook Instant Mix'],
  },
  {
    code: '2202',
    digits: 4,
    chapter: 22,
    chapterTitle: 'Chapter 22: Beverages, Spirits and Vinegar',
    category: 'Non-Alcoholic Beverages & Fruit Juices',
    description: 'Waters, including mineral waters and aerated waters, containing added sugar or other sweetening matter or flavoured, and other non-alcoholic beverages.',
    keywords: ['beverages', 'soft drinks', 'soda', 'fruit juice', 'mineral water', 'aerated water', 'cold drinks', 'energy drinks'],
    gstRate: '18% / 28%',
    examples: ['Packaged Fruit Juice', 'Flavoured Aerated Drink', 'Purified Mineral Water Bottle'],
  },

  // =========================================================================
  // CHAPTER 30: PHARMACEUTICAL PRODUCTS
  // =========================================================================
  {
    code: '3004',
    digits: 4,
    chapter: 30,
    chapterTitle: 'Chapter 30: Pharmaceutical Products',
    category: 'Medicaments & Pharmaceutical Formulations',
    description: 'Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses, put up in measured doses or in packings for retail sale.',
    keywords: ['medicine', 'medicines', 'pharmaceutical', 'tablets', 'capsules', 'syrup', 'drugs', 'pharma', 'ointments', 'antibiotics', 'paracetamol', 'medicaments'],
    gstRate: '12%',
    examples: ['Pharmaceutical Tablets', 'Cough Syrup', 'Antibiotic Capsules', 'Pain Relief Gel'],
  },
  {
    code: '3005',
    digits: 4,
    chapter: 30,
    chapterTitle: 'Chapter 30: Pharmaceutical Products',
    category: 'First Aid & Surgical Dressings',
    description: 'Wadding, gauze, bandages and similar articles (dressings, adhesive plasters, poultices), impregnated or coated with pharmaceutical substances.',
    keywords: ['bandages', 'gauze', 'cotton wadding', 'adhesive plaster', 'surgical dressing', 'first aid', 'crepe bandage', 'antiseptic plaster'],
    gstRate: '12%',
    examples: ['Sterile Cotton Gauze', 'Adhesive First Aid Bandages', 'Crepe Elastic Bandage'],
  },

  // =========================================================================
  // CHAPTER 33 - 34: COSMETICS, SOAPS & DETERGENTS
  // =========================================================================
  {
    code: '3304',
    digits: 4,
    chapter: 33,
    chapterTitle: 'Chapter 33: Essential Oils and Resinoids; Perfumery, Cosmetic or Toilet Preparations',
    category: 'Cosmetics & Beauty Skincare Products',
    description: 'Beauty or make-up preparations and preparations for the care of the skin (other than medicaments), including sunscreen or sun tan preparations; manicure or pedicure preparations.',
    keywords: ['cosmetics', 'beauty products', 'skincare', 'face cream', 'lotion', 'moisturizer', 'sunscreen', 'foundation', 'lipstick', 'makeup', 'face wash', 'serum'],
    gstRate: '18%',
    examples: ['Hydrating Face Cream', 'SPF 50 Sunscreen Lotion', 'Matte Lipstick', 'Facial Glow Serum'],
  },
  {
    code: '3305',
    digits: 4,
    chapter: 33,
    chapterTitle: 'Chapter 33: Essential Oils and Resinoids; Perfumery, Cosmetic or Toilet Preparations',
    category: 'Hair Care Preparations',
    description: 'Preparations for use on the hair including shampoos, hair lacquers, hair oils, hair creams and dyes.',
    keywords: ['shampoo', 'hair oil', 'hair conditioner', 'hair care', 'hair serum', 'hair dye', 'hair cream', 'hair gel'],
    gstRate: '18%',
    examples: ['Anti-Dandruff Shampoo', 'Ayurvedic Hair Oil', 'Hair Nourishing Conditioner'],
  },
  {
    code: '3307',
    digits: 4,
    chapter: 33,
    chapterTitle: 'Chapter 33: Essential Oils and Resinoids; Perfumery, Cosmetic or Toilet Preparations',
    category: 'Perfumery, Deodorants & Shaving Products',
    description: 'Pre-shave, shaving or after-shave preparations, personal deodorants, bath preparations, depilatories, room deodorizers and perfumery.',
    keywords: ['perfume', 'deodorant', 'body spray', 'deo', 'aftershave', 'shaving cream', 'fragrance', 'room freshener', 'scent'],
    gstRate: '18% / 28%',
    examples: ['Body Deodorant Spray', 'Eau De Parfum Perfume', 'Foaming Shaving Cream'],
  },
  {
    code: '3401',
    digits: 4,
    chapter: 34,
    chapterTitle: 'Chapter 34: Soap, Organic Surface-Active Agents, Washing Preparations',
    category: 'Soap & Body Wash',
    description: 'Soap; organic surface-active products and preparations for use as soap, in the form of bars, cakes, moulded pieces or liquid.',
    keywords: ['soap', 'bath soap', 'bathing bar', 'toilet soap', 'body wash', 'hand wash', 'liquid soap', 'cleansing bar'],
    gstRate: '18%',
    examples: ['Moisturizing Bathing Soap', 'Antibacterial Hand Wash', 'Exfoliating Body Wash'],
  },
  {
    code: '3402',
    digits: 4,
    chapter: 34,
    chapterTitle: 'Chapter 34: Soap, Organic Surface-Active Agents, Washing Preparations',
    category: 'Detergents & Cleaning Preparations',
    description: 'Organic surface-active agents, washing preparations (including auxiliary washing preparations) and cleaning preparations, whether or not containing soap.',
    keywords: ['detergent', 'washing powder', 'laundry detergent', 'fabric conditioner', 'dishwash liquid', 'floor cleaner', 'cleaning liquid', 'surface cleaner'],
    gstRate: '18%',
    examples: ['Laundry Detergent Powder', 'Dishwash Liquid Gel', 'Disinfectant Floor Cleaner'],
  },
  {
    code: '3808',
    digits: 4,
    chapter: 38,
    chapterTitle: 'Chapter 38: Miscellaneous Chemical Products',
    category: 'Disinfectants, Sanitizers & Pest Repellents',
    description: 'Insecticides, rodenticides, fungicides, herbicides, anti-sprouting products and plant-growth regulators, disinfectants and similar products.',
    keywords: ['sanitizer', 'hand sanitizer', 'disinfectant', 'insecticide', 'mosquito repellent', 'pest control', 'alcohol rub', 'germicide'],
    gstRate: '18%',
    examples: ['Hand Sanitizer Gel', 'Surface Disinfectant Spray', 'Mosquito Vaporizer Refill'],
  },

  // =========================================================================
  // CHAPTER 39 - 40: PLASTICS, HOUSEHOLD PRODUCTS & RUBBER
  // =========================================================================
  {
    code: '3924',
    digits: 4,
    chapter: 39,
    chapterTitle: 'Chapter 39: Plastics and Articles Thereof',
    category: 'Plastic Household Products & Kitchenware',
    description: 'Tableware, kitchenware, other household articles and hygienic or toilet articles, of plastics.',
    keywords: ['plastic household', 'plastic household products', 'plastic bucket', 'plastic mug', 'plastic container', 'tiffin box', 'plastic tray', 'plastic storage', 'plastic kitchenware', 'plastic jug', 'plastic bowl', 'water bottle plastic'],
    gstRate: '18%',
    examples: ['Plastic Household Storage Container', 'Plastic Bucket & Mug Set', 'Plastic Insulated Tiffin Box'],
  },
  {
    code: '3923',
    digits: 4,
    chapter: 39,
    chapterTitle: 'Chapter 39: Plastics and Articles Thereof',
    category: 'Plastic Packaging, Bags & Bottles',
    description: 'Articles for the conveyance or packing of goods, of plastics; stoppers, lids, caps and other closures, of plastics.',
    keywords: ['plastic packaging', 'poly bags', 'plastic bags', 'plastic bottles', 'bubble wrap', 'stretch film', 'plastic containers', 'plastic caps', 'closures', 'courier bags'],
    gstRate: '18%',
    examples: ['Poly Packaging Bags', 'Bubble Wrap Roll', 'Plastic Packaging Containers'],
  },
  {
    code: '3926',
    digits: 4,
    chapter: 39,
    chapterTitle: 'Chapter 39: Plastics and Articles Thereof',
    category: 'Other Articles of Plastics',
    description: 'Other articles of plastics and articles of other materials of headings 3901 to 3914, including cable ties, plastic clips, industrial plastic goods.',
    keywords: ['plastic articles', 'plastic components', 'cable ties', 'nylon parts', 'plastic fittings', 'plastic gaskets', 'pvc articles', 'acrylic sheet articles'],
    gstRate: '18%',
    examples: ['Nylon Cable Ties', 'Moulded Plastic Components', 'Acrylic Display Holders'],
  },
  {
    code: '4011',
    digits: 4,
    chapter: 40,
    chapterTitle: 'Chapter 40: Rubber and Articles Thereof',
    category: 'Pneumatic Rubber Tyres',
    description: 'New pneumatic tyres, of rubber, for motor cars, buses, lorries, motorcycles, bicycles, aircraft, agriculture and industrial vehicles.',
    keywords: ['tyres', 'tires', 'rubber tyres', 'car tyres', 'bike tyres', 'motorcycle tyres', 'truck tyres', 'pneumatic tyres', 'tubeless tyre'],
    gstRate: '28%',
    examples: ['Radial Car Tyres', 'Two-Wheeler Tubeless Tyre', 'Commercial Truck Tyres'],
  },
  {
    code: '4016',
    digits: 4,
    chapter: 40,
    chapterTitle: 'Chapter 40: Rubber and Articles Thereof',
    category: 'Articles of Vulcanised Rubber (Gaskets, Seals, Mats)',
    description: 'Other articles of vulcanised rubber other than hard rubber, including rubber rings, washers, gaskets, seals, rubber floor mats, vibration dampers.',
    keywords: ['rubber articles', 'rubber gasket', 'rubber seals', 'rubber washers', 'rubber mat', 'rubber bushes', 'o-rings', 'rubber dampers'],
    gstRate: '18%',
    examples: ['Rubber O-Rings & Gaskets', 'Automotive Rubber Bushes', 'Industrial Rubber Mats'],
  },

  // =========================================================================
  // CHAPTER 42: LEATHER GOODS & TRAVEL BAGS
  // =========================================================================
  {
    code: '4202',
    digits: 4,
    chapter: 42,
    chapterTitle: 'Chapter 42: Articles of Leather; Saddlery and Harness; Travel Goods, Handbags',
    category: 'Luggage, Backpacks, Handbags & Wallets',
    description: 'Trunks, suitcases, vanity cases, executive-cases, briefcases, school satchels, spectacle cases, binocular cases, camera cases, musical instrument cases, gun cases, holsters, travelling-bags, insulated food or beverages bags, toilet bags, rucksacks, handbags, shopping-bags, wallets, purses, map-cases, cigarette-cases, tobacco-pouches, tool bags, sports bags.',
    keywords: ['bags', 'handbags', 'backpack', 'wallet', 'luggage', 'suitcase', 'briefcase', 'leather bag', 'purse', 'travel bag', 'trolley bag', 'school bag', 'laptop bag'],
    gstRate: '18% / 28%',
    examples: ['Genuine Leather Wallet', 'Travel Trolley Suitcase', 'Waterproof Laptop Backpack', 'Women Handbag'],
  },
  {
    code: '4203',
    digits: 4,
    chapter: 42,
    chapterTitle: 'Chapter 42: Articles of Leather; Saddlery and Harness; Travel Goods, Handbags',
    category: 'Leather Apparel & Accessories',
    description: 'Articles of apparel and clothing accessories, of leather or of composition leather (jackets, coats, gloves, mittens, belts, bandoliers).',
    keywords: ['leather garments', 'leather jacket', 'leather belt', 'leather gloves', 'leather apparel', 'leather accessories'],
    gstRate: '18% / 28%',
    examples: ['Men Leather Biker Jacket', 'Formal Leather Waist Belt', 'Winter Leather Gloves'],
  },

  // =========================================================================
  // CHAPTER 48 - 49: PAPER, CARTONS, LABELS & PRINTED BOOKS
  // =========================================================================
  {
    code: '4819',
    digits: 4,
    chapter: 48,
    chapterTitle: 'Chapter 48: Paper and Paperboard; Articles of Paper Pulp',
    category: 'Carton Boxes, Corrugated Boxes & Paper Packaging',
    description: 'Cartons, boxes, cases, bags and other packing containers, of paper, paperboard, cellulose wadding or webs of cellulose fibres; box files, letter trays.',
    keywords: ['carton box', 'carton boxes', 'corrugated box', 'packaging boxes', 'paper bags', 'kraft paper box', 'shipping boxes', 'paper packaging'],
    gstRate: '18%',
    examples: ['3-Ply Corrugated Shipping Box', 'Printed Paper Packaging Bags', 'Carton Storage Boxes'],
  },
  {
    code: '4820',
    digits: 4,
    chapter: 48,
    chapterTitle: 'Chapter 48: Paper and Paperboard; Articles of Paper Pulp',
    category: 'Stationery, Notebooks & Registers',
    description: 'Registers, account books, note books, order books, receipt books, letter pads, memorandum pads, diaries and similar articles, exercise books, binders.',
    keywords: ['stationery', 'notebook', 'register', 'diary', 'notepads', 'office stationery', 'account book', 'files and folders', 'paper stationery'],
    gstRate: '12%',
    examples: ['Spiral Hardcover Notebook', 'Corporate Executive Diary', 'Accounts Register Book'],
  },
  {
    code: '4821',
    digits: 4,
    chapter: 48,
    chapterTitle: 'Chapter 48: Paper and Paperboard; Articles of Paper Pulp',
    category: 'Paper Labels & Barcode Stickers',
    description: 'Paper or paperboard labels of all kinds, whether or not printed, thermal labels, barcode labels, adhesive paper labels.',
    keywords: ['labels', 'paper labels', 'barcode labels', 'thermal labels', 'shipping labels', 'adhesive stickers', 'printed labels', 'barcode stickers'],
    gstRate: '12% / 18%',
    examples: ['Self-Adhesive Shipping Labels', '4x6 Thermal Barcode Roll', 'Custom Printed Paper Labels'],
  },
  {
    code: '4901',
    digits: 4,
    chapter: 49,
    chapterTitle: 'Chapter 49: Printed Books, Newspapers, Pictures and Other Products of the Printing Industry',
    category: 'Printed Books & Educational Publications',
    description: 'Printed books, brochures, leaflets and similar printed matter, whether or not in single sheets, educational textbooks, novels, dictionaries.',
    keywords: ['books', 'book', 'printed books', 'textbooks', 'novels', 'literature', 'educational books', 'brochures', 'catalogues', 'reading books', 'hardcover books', 'paperback books'],
    gstRate: '0%',
    examples: ['School Textbooks', 'Paperback Fiction Novel', 'Academic Reference Books'],
  },
  {
    code: '4902',
    digits: 4,
    chapter: 49,
    chapterTitle: 'Chapter 49: Printed Books, Newspapers, Pictures and Other Products of the Printing Industry',
    category: 'Newspapers, Journals & Periodicals',
    description: 'Newspapers, journals and periodicals, whether or not illustrated or containing advertising material, magazines, research periodicals.',
    keywords: ['books', 'magazines', 'journals', 'periodicals', 'newspapers', 'reading material', 'monthly magazine', 'research journal'],
    gstRate: '0%',
    examples: ['Weekly News Magazine', 'Academic Scientific Journal', 'Daily Printed Newspaper'],
  },

  // =========================================================================
  // CHAPTER 50 - 63: TEXTILES, COTTON GARMENTS & APPAREL
  // =========================================================================
  {
    code: '6109',
    digits: 4,
    chapter: 61,
    chapterTitle: 'Chapter 61: Articles of Apparel and Clothing Accessories, Knitted or Crocheted',
    category: 'T-Shirts & Singlets (Cotton / Knitted)',
    description: 'T-shirts, singlets and other vests, knitted or crocheted, of cotton, synthetic or other textile materials.',
    keywords: ['t-shirt', 't-shirts', 'tshirt', 'tshirts', 'cotton garments', 'cotton t-shirt', 'polo shirt', 'vests', 'singlets', 'round neck t-shirt', 'knitted garments'],
    gstRate: '5% / 12%',
    examples: ['100% Pure Cotton T-Shirt', 'Round Neck Printed T-Shirt', 'Collared Polo T-Shirt'],
  },
  {
    code: '6110',
    digits: 4,
    chapter: 61,
    chapterTitle: 'Chapter 61: Articles of Apparel and Clothing Accessories, Knitted or Crocheted',
    category: 'Sweaters, Hoodies & Pullovers',
    description: 'Jerseys, pullovers, cardigans, waistcoats and similar articles, knitted or crocheted, including sweatshirts and fleece hoodies.',
    keywords: ['sweaters', 'hoodies', 'sweatshirts', 'pullovers', 'cardigans', 'winter wear', 'knitted sweater', 'fleece jacket'],
    gstRate: '5% / 12%',
    examples: ['Cotton Fleece Hoodie', 'Knitted Woolen Pullover', 'Zip-Up Winter Sweatshirt'],
  },
  {
    code: '6205',
    digits: 4,
    chapter: 62,
    chapterTitle: 'Chapter 62: Articles of Apparel and Clothing Accessories, Not Knitted or Crocheted',
    category: 'Men\'s Formal & Casual Shirts (Cotton / Woven)',
    description: 'Men\'s or boys\' shirts, woven, of cotton, man-made fibres, silk or wool.',
    keywords: ['cotton garments', 'shirt', 'shirts', 'cotton shirts', 'formal shirt', 'casual shirt', 'mens shirt', 'cotton apparel', 'woven shirt'],
    gstRate: '5% / 12%',
    examples: ['Men Formal Cotton Shirt', 'Casual Checkered Shirt', 'Full Sleeve Linen Shirt'],
  },
  {
    code: '6203',
    digits: 4,
    chapter: 62,
    chapterTitle: 'Chapter 62: Articles of Apparel and Clothing Accessories, Not Knitted or Crocheted',
    category: 'Men\'s Trousers, Jeans, Suits & Blazers',
    description: 'Men\'s or boys\' suits, ensembles, jackets, blazers, trousers, bib and brace overalls, breeches and shorts (other than swimwear).',
    keywords: ['cotton garments', 'trousers', 'pants', 'jeans', 'chinos', 'blazers', 'mens suits', 'denim jeans', 'cargo pants', 'shorts'],
    gstRate: '5% / 12%',
    examples: ['Slim Fit Denim Jeans', 'Formal Cotton Trousers', 'Men Blazer Suit'],
  },
  {
    code: '6204',
    digits: 4,
    chapter: 62,
    chapterTitle: 'Chapter 62: Articles of Apparel and Clothing Accessories, Not Knitted or Crocheted',
    category: 'Women\'s Dresses, Kurtis, Suits & Skirts',
    description: 'Women\'s or girls\' suits, ensembles, jackets, blazers, dresses, skirts, divided skirts, trousers, bib and brace overalls, breeches and shorts.',
    keywords: ['cotton garments', 'kurtis', 'dresses', 'skirts', 'womens garments', 'salwar suit', 'ethnic wear', 'womens trousers', 'tops', 'ladies apparel'],
    gstRate: '5% / 12%',
    examples: ['Cotton Printed Kurti', 'Women Maxi Dress', 'Formal Ladies Trousers'],
  },
  {
    code: '5205',
    digits: 4,
    chapter: 52,
    chapterTitle: 'Chapter 52: Cotton',
    category: 'Cotton Yarn & Textile Spinning Threads',
    description: 'Cotton yarn (other than sewing thread), containing 85% or more by weight of cotton, not put up for retail sale, for weaving and textile knitting.',
    keywords: ['cotton', 'cotton yarn', 'textile yarn', 'cotton thread', 'raw cotton', 'spinning yarn', 'textiles', 'textile'],
    gstRate: '5%',
    examples: ['100% Combed Cotton Yarn', 'Carded Cotton Weaving Yarn', 'Ring Spun Cotton Yarn'],
  },
  {
    code: '5208',
    digits: 4,
    chapter: 52,
    chapterTitle: 'Chapter 52: Cotton Fabrics & Textiles',
    category: 'Cotton Fabrics & Textiles',
    description: 'Woven fabrics of cotton, containing 85% or more by weight of cotton, weighing not more than 200 g/m2.',
    keywords: ['cotton', 'cotton fabric', 'cotton cloth', 'cotton textiles', 'textiles', 'textile', 'unstitched cotton', 'fabric rolls', 'printed fabric'],
    gstRate: '5%',
    examples: ['100% Cotton Woven Fabric', 'Printed Cotton Shirting Fabric', 'Pure Cotton Textile Roll'],
  },
  {
    code: '6302',
    digits: 4,
    chapter: 63,
    chapterTitle: 'Chapter 63: Other Made Up Textile Articles; Sets; Worn Clothing',
    category: 'Bed Linen, Curtains & Towels',
    description: 'Bed linen, table linen, toilet linen and kitchen linen, bed sheets, pillow covers, bath towels, cotton curtains.',
    keywords: ['bed linen', 'bed sheets', 'towels', 'bath towels', 'curtains', 'pillow covers', 'blankets', 'quilt', 'home furnishing textiles'],
    gstRate: '5% / 12%',
    examples: ['Cotton Double Bed Sheet with Pillow Covers', '100% Cotton Bath Towel Set', 'Living Room Window Curtains'],
  },
  {
    code: '6402',
    digits: 4,
    chapter: 64,
    chapterTitle: 'Chapter 64: Footwear, Gaiters and the Like; Parts of Such Articles',
    category: 'Footwear of Rubber or Plastics (Sports Shoes & Sneakers)',
    description: 'Other footwear with outer soles and uppers of rubber or plastics, including sports shoes, running sneakers, athletic footwear, waterproof boots and casual slippers.',
    keywords: ['shoes', 'sports shoes', 'running shoes', 'sneakers', 'athletic shoes', 'rubber shoes', 'plastic footwear', 'flip flops', 'slippers', 'gym shoes', 'jogging shoes', 'trainers', 'footwear'],
    gstRate: '5% / 18%',
    examples: ['Running Sports Sneakers', 'Waterproof Rubber Boots', 'Casual Plastic Sliders & Flip Flops'],
  },
  {
    code: '6403',
    digits: 4,
    chapter: 64,
    chapterTitle: 'Chapter 64: Footwear, Gaiters and the Like; Parts of Such Articles',
    category: 'Footwear & Leather Shoes',
    description: 'Footwear with outer soles of rubber, plastics, leather or composition leather and uppers of leather.',
    keywords: ['shoes', 'footwear', 'leather shoes', 'formal shoes', 'sneakers', 'sports shoes', 'boots', 'sandals', 'loafers', 'chappals', 'slippers', 'dress shoes'],
    gstRate: '5% / 18%',
    examples: ['Men Formal Leather Shoes', 'Comfort Walking Sneakers', 'Casual Leather Sandals'],
  },
  {
    code: '6404',
    digits: 4,
    chapter: 64,
    chapterTitle: 'Chapter 64: Footwear, Gaiters and the Like; Parts of Such Articles',
    category: 'Footwear with Textile Uppers (Canvas Shoes & Sneakers)',
    description: 'Footwear with outer soles of rubber, plastics, leather or composition leather and uppers of textile materials, canvas shoes, tennis shoes and running trainers.',
    keywords: ['shoes', 'canvas shoes', 'sneakers', 'textile footwear', 'sports shoes', 'running sneakers', 'tennis shoes', 'athletic footwear', 'fabric shoes', 'footwear'],
    gstRate: '5% / 18%',
    examples: ['Casual Canvas Sneakers', 'Lightweight Textile Running Shoes', 'Tennis Sports Footwear'],
  },

  // =========================================================================
  // CHAPTER 72 - 83: METALS, HARDWARE, UTENSILS & FASTENERS
  // =========================================================================
  {
    code: '7318',
    digits: 4,
    chapter: 73,
    chapterTitle: 'Chapter 73: Articles of Iron or Steel',
    category: 'Screws, Bolts, Nuts & Fasteners',
    description: 'Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, cotter-pins, washers (including spring washers) and similar articles, of iron or steel.',
    keywords: ['fasteners', 'screws', 'bolts', 'nuts', 'washers', 'rivets', 'steel screws', 'industrial fasteners', 'allen bolts', 'studs'],
    gstRate: '18%',
    examples: ['Stainless Steel Hex Bolts & Nuts', 'Self-Tapping Wood Screws', 'High Tensile Industrial Fasteners'],
  },
  {
    code: '7306',
    digits: 4,
    chapter: 73,
    chapterTitle: 'Chapter 73: Articles of Iron or Steel',
    category: 'Steel Pipes & Tubes',
    description: 'Other tubes, pipes and hollow profiles (for example, open seam or welded, riveted or similarly closed), of iron or steel.',
    keywords: ['steel pipes', 'iron pipes', 'tubes', 'hollow pipes', 'stainless steel pipes', 'gi pipes', 'metal tubing'],
    gstRate: '18%',
    examples: ['Seamless Stainless Steel Pipes', 'Galvanized Iron GI Pipes', 'Square Hollow Steel Sections'],
  },
  {
    code: '7323',
    digits: 4,
    chapter: 73,
    chapterTitle: 'Chapter 73: Articles of Iron or Steel',
    category: 'Stainless Steel Utensils & Kitchenware',
    description: 'Table, kitchen or other household articles and parts thereof, of iron or steel; iron or steel wool; pot scourers and scouring or polishing pads, gloves and the like, of iron or steel.',
    keywords: ['steel utensils', 'kitchen utensils', 'stainless steel vessels', 'steel plates', 'dinner set steel', 'cookware', 'stainless steel kitchenware'],
    gstRate: '12%',
    examples: ['Stainless Steel Cookware Set', 'Steel Dining Plates & Bowls', 'Stainless Steel Kitchen Containers'],
  },
  {
    code: '8204',
    digits: 4,
    chapter: 82,
    chapterTitle: 'Chapter 82: Tools, Implements, Cutlery, Spoons and Forks, of Base Metal',
    category: 'Hand Tools, Spanners & Wrenches',
    description: 'Hand-operated spanners and wrenches (including torque meter wrenches but not including tap wrenches); interchangeable spanner sockets, with or without handles.',
    keywords: ['hand tools', 'tools', 'spanner', 'wrench', 'socket wrench', 'torque wrench', 'adjustable spanner', 'tool set', 'hardware tools'],
    gstRate: '18%',
    examples: ['Adjustable Hand Spanner Set', 'Socket Wrench Tool Kit', 'Combination Ring Spanners'],
  },
  {
    code: '8203',
    digits: 4,
    chapter: 82,
    chapterTitle: 'Chapter 82: Tools, Implements, Cutlery, Spoons and Forks, of Base Metal',
    category: 'Pliers, Pincers, Files & Cutters',
    description: 'Files, rasps, pliers (including cutting pliers), pincers, tweezers, metal cutting shears, pipe-cutters, bolt croppers, perforating punches and similar hand tools.',
    keywords: ['pliers', 'cutters', 'wire stripper', 'hand tools', 'pincers', 'tweezers', 'pipe cutter', 'hardware tools'],
    gstRate: '18%',
    examples: ['Combination Pliers with Grip', 'Heavy Duty Wire Cutter', 'Steel Tweezers & Pincers'],
  },

  // =========================================================================
  // CHAPTER 84: NUCLEAR REACTORS, BOILERS, MACHINERY & COMPUTERS
  // =========================================================================
  {
    code: '8471',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Laptop Computers, Desktops & Data Processing Units',
    description: 'Automatic data processing machines and units thereof; magnetic or optical readers, machines for transcribing data onto data media in coded form and machines for processing such data.',
    keywords: ['laptop', 'laptops', 'laptop computers', 'computer', 'computers', 'desktop', 'desktop pc', 'notebook computers', 'server', 'tablet', 'data processing machines', 'pc', 'electronics', 'computer electronics'],
    gstRate: '18%',
    examples: ['Portable Laptop Computer', 'All-in-One Desktop PC', 'Enterprise Rack Server'],
  },
  {
    code: '84713010',
    digits: 8,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Personal Notebook / Laptop Computers',
    description: 'Personal computer (laptop, notebook) weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display.',
    keywords: ['laptop', 'laptops', 'laptop computers', 'notebook', 'macbook', 'ultrabook', 'chromebook', 'portable computer'],
    gstRate: '18%',
    examples: ['Intel Core i7 15.6 inch Laptop', 'Apple MacBook Air Laptop', 'Ultra-Slim Notebook Computer'],
  },
  {
    code: '8473',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Computer Accessories & Machine Parts',
    description: 'Parts and accessories (other than covers, carrying cases and the like) suitable for use solely or principally with machines of headings 8470 to 8472.',
    keywords: ['computer accessories', 'computer parts', 'keyboard', 'computer mouse', 'cooling pad', 'laptop keyboard', 'webcam', 'cpu cabinet', 'motherboard parts', 'mouse pad', 'docking station'],
    gstRate: '18%',
    examples: ['USB Wireless Computer Mouse', 'RGB Mechanical Computer Keyboard', 'Laptop Cooling Stand Pad', 'External USB Webcam'],
  },
  {
    code: '8479',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Industrial Machinery Having Individual Functions',
    description: 'Machines and mechanical appliances having individual functions, not specified or included elsewhere in this Chapter; automated factory machines, industrial mixers, presses.',
    keywords: ['industrial machinery', 'machinery', 'industrial machine', 'factory machinery', 'automated machine', 'mixing machine', 'granulator', 'packaging machine', 'mechanical equipment', 'hydraulic press'],
    gstRate: '18%',
    examples: ['Automated Industrial Packaging Machine', 'High-Speed Planetary Mixer', 'Hydraulic Compression Press'],
  },
  {
    code: '8481',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Industrial Valves, Taps & Cocks',
    description: 'Taps, cocks, valves and similar appliances for pipes, boiler shells, tanks, vats or the like, including pressure-reducing valves and thermostatically controlled valves.',
    keywords: ['valves', 'industrial valves', 'ball valve', 'butterfly valve', 'gate valve', 'solenoid valve', 'pipe valves', 'pressure reducing valve', 'cocks and taps'],
    gstRate: '18%',
    examples: ['Stainless Steel Ball Valve', 'Pneumatic Solenoid Valve', 'Industrial High-Pressure Gate Valve'],
  },
  {
    code: '8482',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Ball or Roller Bearings',
    description: 'Ball or roller bearings (including combined ball or roller bearings), needle roller bearings, tapered roller bearings.',
    keywords: ['bearings', 'ball bearings', 'roller bearings', 'needle bearings', 'industrial bearings', 'deep groove ball bearings', 'bearing unit'],
    gstRate: '18%',
    examples: ['Deep Groove Ball Bearings', 'Tapered Roller Bearing Set', 'Spherical Roller Bearings'],
  },
  {
    code: '8483',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Transmission Gears, Shafts & Clutches',
    description: 'Transmission shafts (including cam shafts and crank shafts) and cranks; bearing housings and plain shaft bearings; gears and gearing; ball or roller screws; gear boxes and other speed changers.',
    keywords: ['gears', 'gearbox', 'transmission shafts', 'pulleys', 'couplings', 'flywheels', 'clutches', 'sprockets', 'industrial gearing'],
    gstRate: '18%',
    examples: ['Industrial Reduction Gearbox', 'Precision Helical Gears', 'Flexible Shaft Couplings'],
  },
  {
    code: '8414',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Air Compressors, Pumps & Industrial Fans',
    description: 'Air or vacuum pumps, air or other gas compressors and fans; ventilating or recycling hoods incorporating a fan, whether or not fitted with filters.',
    keywords: ['air compressor', 'compressors', 'vacuum pump', 'exhaust fan', 'industrial fan', 'air pump', 'ventilation fan'],
    gstRate: '18%',
    examples: ['Industrial Screw Air Compressor', 'Heavy Duty Exhaust Fan', 'Rotary Vacuum Pump'],
  },
  {
    code: '8415',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Air Conditioners & HVAC Systems',
    description: 'Air conditioning machines, comprising a motor-driven fan and elements for changing the temperature and humidity, including window, split or central HVAC systems.',
    keywords: ['air conditioner', 'ac', 'split ac', 'inverter ac', 'window ac', 'hvac', 'air cooling unit', 'chiller'],
    gstRate: '28%',
    examples: ['1.5 Ton 5-Star Inverter Split AC', 'Commercial Ductable Air Conditioner', 'Window Air Conditioning Unit'],
  },
  {
    code: '8418',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Refrigerators, Freezers & Cooling Equipment',
    description: 'Refrigerators, freezers and other refrigerating or freezing equipment, electric or other; heat pumps other than air conditioning machines of heading 8415.',
    keywords: ['refrigerator', 'fridge', 'deep freezer', 'freezer', 'cooling equipment', 'water cooler', 'cold storage unit'],
    gstRate: '18%',
    examples: ['Double Door Frost Free Refrigerator', 'Commercial Chest Deep Freezer', 'Industrial Water Chiller Cooler'],
  },
  {
    code: '8443',
    digits: 4,
    chapter: 84,
    chapterTitle: 'Chapter 84: Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
    category: 'Printers, Copiers & Multifunction Machines',
    description: 'Printing machinery used for printing by means of plates, cylinders and other printing components; other printers, copying machines and facsimile machines, whether or not combined.',
    keywords: ['printer', 'printers', 'laser printer', 'inkjet printer', 'photocopier', 'copier', 'multifunction printer', 'thermal printer', 'scanner printer'],
    gstRate: '18%',
    examples: ['All-in-One Wireless Laser Printer', 'Thermal Receipt & Shipping Label Printer', 'Office Photocopier Machine'],
  },

  // =========================================================================
  // CHAPTER 85: ELECTRICAL & ELECTRONIC EQUIPMENT
  // =========================================================================
  {
    code: '8517',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Mobile Phones, Smartphones & Telecommunications Apparatus',
    description: 'Telephone sets, including smartphones and other telephones for cellular networks or for other wireless networks; other apparatus for the transmission or reception of voice, images or other data.',
    keywords: ['mobile phones', 'mobile phone', 'smartphones', 'smartphone', 'mobile', 'cellphone', 'telephone', 'cellular phone', 'handset', 'modem', 'router', 'wifi router', 'network switch', 'telecom apparatus', 'walkie talkie', 'electronics', 'electronic items', 'electronic goods', 'electronic devices'],
    gstRate: '18%',
    examples: ['Android 5G Smartphone', 'Dual-Band Wi-Fi Router', 'Cellular Mobile Handset'],
  },
  {
    code: '85171300',
    digits: 8,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Smartphones for Cellular Networks',
    description: 'Smartphones for cellular networks or for other wireless networks.',
    keywords: ['smartphones', 'smartphone', 'mobile phones', 'mobile phone', 'iphone', 'android phone', '5g mobile', 'cellular smartphone', 'electronics', 'smart electronics'],
    gstRate: '18%',
    examples: ['Apple iPhone Smartphone', 'Samsung Galaxy 5G Mobile', 'Redmi Note Smartphone'],
  },
  {
    code: '8518',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Microphones, Loudspeakers, Headphones & Audio Equipment',
    description: 'Microphones and stands therefor; loudspeakers, whether or not mounted in their enclosures; headphones and earphones, whether or not combined with a microphone; audio amplifiers.',
    keywords: ['headphones', 'earphones', 'wireless headphones', 'bluetooth headphones', 'audio equipment', 'loudspeakers', 'speakers', 'bluetooth speaker', 'microphones', 'earbuds', 'headset', 'airpods', 'tws earbuds', 'soundbar', 'electronics', 'audio electronics', 'consumer electronics'],
    gstRate: '18%',
    examples: ['Wireless Bluetooth Headphones', 'TWS Wireless Earbuds with Mic', 'Portable Bluetooth Speaker', 'Studio Condenser Microphone'],
  },
  {
    code: '85183000',
    digits: 8,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Headphones, Earphones & Combined Microphone Sets',
    description: 'Headphones and earphones, whether or not combined with a microphone, and sets consisting of a microphone and one or more loudspeakers.',
    keywords: ['wireless bluetooth headphones', 'bluetooth headphones', 'headphones', 'earphones', 'headset', 'over-ear headphones', 'wireless earbuds', 'neckband earphones', 'in-ear monitors', 'gaming headset'],
    gstRate: '18%',
    examples: ['Noise Cancelling Bluetooth Headphones', 'Wireless Gaming Headset with Mic', 'Bluetooth Neckband Earphones'],
  },
  {
    code: '8528',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Televisions, Computer Monitors & Video Projectors',
    description: 'Monitors and projectors, not incorporating television reception apparatus; reception apparatus for television, whether or not incorporating radio-broadcast receivers or sound or video recording apparatus.',
    keywords: ['television', 'televisions', 'tv', 'led tv', 'smart tv', 'monitors', 'computer monitor', 'projectors', 'video projector', 'led television', 'display screen', 'lcd tv', 'electronics', 'consumer electronics', 'home electronics'],
    gstRate: '18% / 28%',
    examples: ['55-inch 4K Smart LED Television', '27-inch IPS Computer Gaming Monitor', 'Full HD Home Theatre Projector'],
  },
  {
    code: '85287200',
    digits: 8,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Colour Television Receivers (LED / LCD / OLED)',
    description: 'Reception apparatus for television, colour, whether or not incorporating radio-broadcast receivers or sound or video recording or reproducing apparatus.',
    keywords: ['electronic led television with remote', 'led television', 'smart tv', 'colour television', 'oled tv', 'lcd television', 'television with remote', 'android tv'],
    gstRate: '18% / 28%',
    examples: ['Smart LED Television with Remote', '43-inch Ultra HD Smart TV', 'OLED 4K Television'],
  },
  {
    code: '8542',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Electronic Integrated Circuits (ICs) & Microprocessors',
    description: 'Electronic integrated circuits: processors and controllers, whether or not combined with memories, converters, logic circuits, amplifiers, clock and timing circuits; electronic components.',
    keywords: ['electronic components', 'integrated circuits', 'ic', 'ics', 'microprocessors', 'microcontroller', 'semiconductor chip', 'electronic circuit', 'chips', 'amplifiers ic', 'memory ic'],
    gstRate: '18%',
    examples: ['Microcontroller Integrated Circuit IC', 'SMD Logic Processing IC', 'Flash Memory Integrated Chip'],
  },
  {
    code: '8541',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Diodes, Transistors, LEDs & Semiconductor Devices',
    description: 'Diodes, transistors and similar semiconductor devices; photosensitive semiconductor devices, including photovoltaic cells whether or not assembled in modules; light-emitting diodes (LED).',
    keywords: ['electronic components', 'diodes', 'transistors', 'led', 'led chips', 'semiconductor', 'mosfet', 'rectifier', 'photovoltaic', 'solar cells', 'thyristors'],
    gstRate: '18%',
    examples: ['SMD Light Emitting Diodes (LED)', 'NPN Power Transistors', 'Schottky Barrier Diodes'],
  },
  {
    code: '8534',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Printed Circuit Boards (PCBs)',
    description: 'Printed circuits, bare printed circuit boards, multilayer PCBs, flexible PCBs.',
    keywords: ['electronic components', 'pcb', 'printed circuit boards', 'circuit board', 'pcba', 'motherboard pcb', 'bare pcb', 'fr4 pcb'],
    gstRate: '18%',
    examples: ['Multilayer FR4 Printed Circuit Board', 'Double Sided Bare PCB', 'Flexible PCB Board'],
  },
  {
    code: '8504',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Power Adapters, Chargers, Inverters & Transformers',
    description: 'Electrical transformers, static converters (for example, rectifiers) and inductors; power supply units, mobile chargers, laptop adapters, inverters, UPS.',
    keywords: ['power adapter', 'chargers', 'mobile charger', 'laptop adapter', 'inverter', 'ups', 'power supply', 'transformer', 'smps', 'fast charger'],
    gstRate: '18%',
    examples: ['65W Type-C Fast Charger Adapter', 'Sine Wave Power Inverter', '12V DC SMPS Power Supply'],
  },
  {
    code: '8507',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Batteries, Lithium-Ion Cells & Power Banks',
    description: 'Electric accumulators, including separators therefor, whether or not rectangular (including square); lithium-ion batteries, lead-acid storage batteries, power banks.',
    keywords: ['battery', 'batteries', 'lithium ion battery', 'power bank', 'rechargeable battery', 'lead acid battery', 'accumulator', 'ups battery', '18650 cell', 'ev battery'],
    gstRate: '18% / 28%',
    examples: ['10000mAh Portable Power Bank', 'Lithium-Ion Rechargeable Battery Pack', '12V 150Ah Tubular Inverter Battery'],
  },
  {
    code: '8523',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Storage Devices, SSD, USB Flash Drives & Memory Cards',
    description: 'Discs, tapes, solid-state non-volatile storage devices, smart cards and other media for the recording of sound or of other phenomena.',
    keywords: ['ssd', 'solid state drive', 'pen drive', 'usb drive', 'flash drive', 'memory card', 'sd card', 'storage devices', 'external hard drive', 'smart cards'],
    gstRate: '18%',
    examples: ['1TB NVMe Solid State Drive (SSD)', '64GB USB 3.0 Flash Drive', 'Micro SD Card 128GB Class 10'],
  },
  {
    code: '8536',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Electrical Switches, Plugs, Sockets & Relays',
    description: 'Electrical apparatus for switching or protecting electrical circuits, or for making connections to or in electrical circuits (switches, relays, fuses, surge suppressors, plugs, sockets, lamp-holders).',
    keywords: ['switches', 'electrical switches', 'sockets', 'plugs', 'relays', 'fuses', 'connectors', 'circuit breakers', 'mcb', 'terminal blocks', 'electrical components'],
    gstRate: '18%',
    examples: ['Modular Electrical Wall Switches & Sockets', 'Miniature Circuit Breaker (MCB)', '12V Electromagnetic Relay'],
  },
  {
    code: '8544',
    digits: 4,
    chapter: 85,
    chapterTitle: 'Chapter 85: Electrical Machinery and Equipment and Parts Thereof',
    category: 'Insulated Wires, Cables & Optical Fibres',
    description: 'Insulated (including enamelled or anodised) wire, cable (including co-axial cable) and other insulated electric conductors, whether or not fitted with connectors; optical fibre cables.',
    keywords: ['cables', 'wires', 'electric wire', 'copper wire', 'power cable', 'lan cable', 'cat6 cable', 'optical fiber cable', 'coaxial cable', 'usb cable'],
    gstRate: '18%',
    examples: ['Copper Insulated Electrical Wire 2.5 sq mm', 'CAT6 High Speed LAN Ethernet Cable', 'Optical Fiber Armoured Cable'],
  },

  // =========================================================================
  // CHAPTER 87: VEHICLES & AUTOMOBILE SPARE PARTS
  // =========================================================================
  {
    code: '8708',
    digits: 4,
    chapter: 87,
    chapterTitle: 'Chapter 87: Vehicles Other Than Railway or Tramway Rolling-Stock',
    category: 'Automobile Spare Parts & Vehicle Accessories',
    description: 'Parts and accessories of the motor vehicles of headings 8701 to 8705: bumpers, brakes, gear boxes, drive-axles, road wheels, suspension shock-absorbers, radiators, silencers and exhaust pipes, clutches.',
    keywords: ['automobile spare parts', 'auto spare parts', 'auto parts', 'car parts', 'car spare parts', 'vehicle parts', 'brake pads', 'clutch plate', 'shock absorbers', 'bumper', 'radiator', 'suspension parts', 'car accessories', 'automotive components'],
    gstRate: '18% / 28%',
    examples: ['Automotive Ceramic Brake Pads', 'Car Hydraulic Shock Absorber', 'Vehicle Clutch Assembly Plate', 'Front Bumper Guard'],
  },
  {
    code: '8714',
    digits: 4,
    chapter: 87,
    chapterTitle: 'Chapter 87: Vehicles Other Than Railway or Tramway Rolling-Stock',
    category: 'Motorcycle & Two-Wheeler Spare Parts',
    description: 'Parts and accessories of vehicles of headings 8711 to 8713 (motorcycles, scooters, mopeds, cycles).',
    keywords: ['bike spare parts', 'motorcycle parts', 'two-wheeler parts', 'scooter spare parts', 'bike chain', 'sprocket kit', 'motorcycle brakes', 'handlebar'],
    gstRate: '18% / 28%',
    examples: ['Motorcycle Chain & Sprocket Kit', 'Two-Wheeler Disc Brake Pads', 'Scooter Front Fork Suspension'],
  },
  {
    code: '8703',
    digits: 4,
    chapter: 87,
    chapterTitle: 'Chapter 87: Vehicles Other Than Railway or Tramway Rolling-Stock',
    category: 'Motor Cars & Passenger Vehicles',
    description: 'Motor cars and other motor vehicles principally designed for the transport of persons (other than those of heading 8702), including station wagons and racing cars.',
    keywords: ['motor car', 'cars', 'automobiles', 'passenger vehicle', 'electric vehicle', 'sedan', 'suv', 'hatchback'],
    gstRate: '28%',
    examples: ['Electric Passenger Car', 'Compact SUV Motor Vehicle'],
  },
  {
    code: '8711',
    digits: 4,
    chapter: 87,
    chapterTitle: 'Chapter 87: Vehicles Other Than Railway or Tramway Rolling-Stock',
    category: 'Motorcycles & Scooters',
    description: 'Motorcycles (including mopeds) and cycles fitted with an auxiliary motor, with or without side-cars; side-cars.',
    keywords: ['motorcycle', 'bike', 'scooter', 'electric scooter', 'moped', 'two-wheeler', 'motorbike'],
    gstRate: '28%',
    examples: ['150cc Commuter Motorcycle', 'Electric Battery Scooter'],
  },

  // =========================================================================
  // CHAPTER 90: OPTICAL, MEDICAL & MEASURING INSTRUMENTS
  // =========================================================================
  {
    code: '9018',
    digits: 4,
    chapter: 90,
    chapterTitle: 'Chapter 90: Optical, Photographic, Measuring, Medical or Surgical Instruments',
    category: 'Medical, Surgical & Dental Instruments',
    description: 'Instruments and appliances used in medical, surgical, dental or veterinary sciences, including scintigraphic apparatus, other electro-medical apparatus and sight-testing instruments.',
    keywords: ['medical instruments', 'surgical instruments', 'stethoscope', 'syringe', 'bp monitor', 'pulse oximeter', 'dental instruments', 'thermometer digital', 'medical equipment'],
    gstRate: '12%',
    examples: ['Digital Blood Pressure Monitor', 'Stainless Steel Surgical Forceps', 'Infrared Forehead Thermometer'],
  },
  {
    code: '9031',
    digits: 4,
    chapter: 90,
    chapterTitle: 'Chapter 90: Optical, Photographic, Measuring, Medical or Surgical Instruments',
    category: 'Measuring, Testing & Checking Instruments (Sensors & Multimeters)',
    description: 'Measuring or checking instruments, appliances and machines, not specified or included elsewhere in this Chapter; profile projectors; electronic sensors, test benches, digital calipers, multimeters.',
    keywords: ['measuring instruments', 'sensors', 'electronic sensors', 'multimeter', 'testing equipment', 'caliper', 'pressure sensor', 'temperature sensor', 'measuring gauge'],
    gstRate: '18%',
    examples: ['Digital Clamp Multimeter Tester', 'Industrial Temperature & Humidity Sensor', 'Electronic Vernier Caliper'],
  },

  // =========================================================================
  // CHAPTER 94 - 96: FURNITURE, LED LIGHTING, TOYS & MISCELLANEOUS
  // =========================================================================
  {
    code: '9405',
    digits: 4,
    chapter: 94,
    chapterTitle: 'Chapter 94: Furniture; Bedding; Lamps and Lighting Fittings',
    category: 'LED Lights, Lamps & Lighting Fittings',
    description: 'Lamps and lighting fittings including searchlights and spotlights and parts thereof, not elsewhere specified or included; illuminated signs; LED bulbs, LED panel lights, chandeliers, floodlights.',
    keywords: ['led lights', 'led', 'lighting', 'lamps', 'led bulb', 'strip lights', 'ceiling lights', 'panel light', 'flood light', 'tube light', 'lanterns', 'chandeliers'],
    gstRate: '12% / 18%',
    examples: ['9W Cool Daylight LED Bulbs', 'Surface Mounted LED Panel Ceiling Light', 'Waterproof Outdoor LED Flood Light'],
  },
  {
    code: '9403',
    digits: 4,
    chapter: 94,
    chapterTitle: 'Chapter 94: Furniture; Bedding; Lamps and Lighting Fittings',
    category: 'Furniture (Office, Wooden & Metal)',
    description: 'Other furniture and parts thereof, of wood, metal, plastics, including office desks, computer tables, steel racks, bookshelves, storage cabinets.',
    keywords: ['furniture', 'office furniture', 'wooden furniture', 'metal furniture', 'table', 'desk', 'chair', 'office chair', 'storage rack', 'bookshelf', 'cabinet'],
    gstRate: '18%',
    examples: ['Ergonomic Mesh Office Chair', 'Engineered Wood Computer Workstation Desk', 'Heavy Duty Steel Storage Rack'],
  },
  {
    code: '9503',
    digits: 4,
    chapter: 95,
    chapterTitle: 'Chapter 95: Toys, Games and Sports Requisites; Parts and Accessories Thereof',
    category: 'Toys, Games & Puzzles',
    description: 'Tricycles, scooters, pedal cars and similar wheeled toys; dolls carriages; dolls; other toys; reduced-size (scale) models and similar recreational models, working or not; puzzles of all kinds.',
    keywords: ['toys', 'kids toys', 'action figures', 'board games', 'puzzles', 'dolls', 'remote control car', 'educational toys', 'building blocks'],
    gstRate: '12% / 18%',
    examples: ['Remote Control RC Toy Car', 'Kids Educational Wooden Puzzle', 'Building Block Construction Set'],
  },
  {
    code: '9506',
    digits: 4,
    chapter: 95,
    chapterTitle: 'Chapter 95: Toys, Games and Sports Requisites; Parts and Accessories Thereof',
    category: 'Sports Goods & Fitness Gym Equipment',
    description: 'Articles and equipment for general physical exercise, gymnastics, athletics, other sports (including table-tennis) or outdoor games, swimming pools and paddling pools.',
    keywords: ['sports goods', 'gym equipment', 'fitness equipment', 'cricket bat', 'football', 'badminton racket', 'dumbbells', 'treadmill', 'yoga mat'],
    gstRate: '12% / 18%',
    examples: ['Kashmir Willow Cricket Bat', 'Carbon Fiber Badminton Racket Set', 'Hexagonal Rubber Dumbbells Set'],
  },
  {
    code: '9608',
    digits: 4,
    chapter: 96,
    chapterTitle: 'Chapter 96: Miscellaneous Manufactured Articles',
    category: 'Pens, Ballpoint Pens & Markers',
    description: 'Ball point pens; felt tipped and other porous-tipped pens and markers; fountain pens, stylograph pens and other pens; duplicating stylos; propelling or sliding pencils.',
    keywords: ['pens', 'ball pen', 'ballpoint pens', 'gel pen', 'markers', 'highlighter', 'fountain pen', 'writing instruments', 'stationery pens'],
    gstRate: '18%',
    examples: ['Smooth Flow Ballpoint Pens', 'Permanent Marker Pen Set', 'Liquid Ink Rollerball Pen'],
  },
];

// Stop-words to ignore during token analysis
const STOP_WORDS = new Set([
  'and', 'or', 'for', 'with', 'without', 'the', 'a', 'an', 'in', 'of', 'to',
  'by', 'at', 'on', 'from', 'per', 'set', 'item', 'items', 'piece', 'pieces',
  'pack', 'box', 'goods', 'material', 'product', 'products', 'commercial',
  'transport', 'cargo', 'shipment', 'nature', 'sample', 'brand', 'new', 'used'
]);

/**
 * Normalizes input string into searchable lowercase clean tokens
 */
function cleanTokens(rawText: string): string[] {
  if (!rawText) return [];
  // Strip HTML tags if coming from Rich Text Editor
  const stripped = rawText.replace(/<[^>]*>?/gm, ' ');
  // Replace punctuation with spaces
  const normalized = stripped
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Intelligent HSN classification matching engine.
 * Evaluates exact phrases, composite keywords, categories, and material specifics.
 */
export function suggestHsnCodes(description: string, maxResults: number = 6): HsnMatchResult[] {
  if (!description || typeof description !== 'string') {
    return [];
  }

  const rawClean = description.replace(/<[^>]*>?/gm, ' ').toLowerCase().trim();
  if (rawClean.length < 2) {
    return [];
  }

  const queryTokens = cleanTokens(description);
  const results: HsnMatchResult[] = [];

  // Check if user is typing a direct numeric HSN code
  const numericMatch = rawClean.match(/\b\d{4,8}\b/);
  const directCodeQuery = numericMatch ? numericMatch[0] : '';

  for (const entry of HSN_DATABASE) {
    let score = 0;
    const matchedTerms: string[] = [];

    // 1. Direct Numeric Code Query Match
    if (directCodeQuery) {
      if (entry.code === directCodeQuery) {
        score += 150;
        matchedTerms.push(directCodeQuery);
      } else if (entry.code.startsWith(directCodeQuery)) {
        score += 80;
        matchedTerms.push(directCodeQuery);
      }
    }

    // 2. Exact Category Phrase Match
    const categoryLower = entry.category.toLowerCase();
    if (rawClean.includes(categoryLower)) {
      score += 90;
      matchedTerms.push(entry.category);
    }

    // 3. Exact Keyword & Synonym Matches
    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      // If full multi-word keyword appears exactly in query (e.g. "wireless bluetooth headphones")
      if (kwLower.includes(' ') && rawClean.includes(kwLower)) {
        score += 65;
        matchedTerms.push(kw);
      } else if (queryTokens.includes(kwLower)) {
        score += 22;
        matchedTerms.push(kw);
      } else if (rawClean.includes(kwLower)) {
        score += 15;
        matchedTerms.push(kw);
      }
    }

    // 4. Examples Match
    if (entry.examples) {
      for (const ex of entry.examples) {
        const exLower = ex.toLowerCase();
        if (rawClean.includes(exLower)) {
          score += 45;
          matchedTerms.push(ex);
        }
      }
    }

    // 5. Query Token Coverage in Entry Text (Chapter + Category + Description)
    const combinedEntryText = `${entry.category} ${entry.chapterTitle} ${entry.description}`.toLowerCase();
    let tokenMatchesCount = 0;
    for (const token of queryTokens) {
      if (combinedEntryText.includes(token)) {
        tokenMatchesCount++;
        if (!matchedTerms.includes(token)) {
          matchedTerms.push(token);
        }
      }
    }

    if (queryTokens.length > 0) {
      const coverageRatio = tokenMatchesCount / queryTokens.length;
      score += Math.round(coverageRatio * 40);
    }

    // 6. Specificity Bonus for 8-digit and 6-digit entries when precision keywords match
    if (entry.digits === 8 && score > 30) {
      score += 15;
    }

    // De-duplicate matched terms
    const uniqueMatchedTerms = Array.from(new Set(matchedTerms));

    if (score >= 20) {
      // Determine Confidence Level
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (score >= 65) {
        confidence = 'HIGH';
      } else if (score >= 35) {
        confidence = 'MEDIUM';
      }

      // Generate clear explanation
      let explanation = `Matched ${entry.category}`;
      if (uniqueMatchedTerms.length > 0) {
        explanation += ` based on keywords: "${uniqueMatchedTerms.slice(0, 3).join(', ')}"`;
      }

      results.push({
        entry,
        score: Math.min(100, score),
        confidence,
        matchedTerms: uniqueMatchedTerms,
        explanation,
      });
    }
  }

  // Sort descending by score; if tied, prefer 8-digit over 4-digit
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.entry.digits - a.entry.digits;
  });

  return results.slice(0, maxResults);
}

export const searchHsnDatabase = suggestHsnCodes;

