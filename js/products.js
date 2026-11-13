/* ==========================================================================
   Healthy — product catalog (DEMO DATA)
   Names, prices, sizes and availability below are demonstration values only.
   Edit this file to replace them with the real catalog.

   Fields
     id          unique number
     name        product name (Arabic)
     category    one of the category ids below
     description one short line
     price       current price in EGP (the price the customer pays)
     oldPrice    original price when on sale, otherwise null
     size        size / weight text
     image       path to the product image (svg, webp, jpg or png)
     available   false shows "غير متوفر حاليًا" and blocks ordering
     featured    true shows the product in "الأكثر طلبًا" on the homepage
     onSale      true shows it in the offers section (needs oldPrice > price)
   ========================================================================== */
const CATEGORIES = [
  { id: "milk",   name: "الألبان",             image: "assets/images/categories/milk.svg" },
  { id: "cheese", name: "الجبن",               image: "assets/images/categories/cheese.svg" },
  { id: "yogurt", name: "الزبادي",             image: "assets/images/categories/yogurt.svg" },
  { id: "juice",  name: "العصائر والمشروبات",  image: "assets/images/categories/juice.svg" }
];

const PRODUCTS = [
  { id: 1,  name: "حليب Healthy طبيعي",      category: "milk",   description: "حليب طبيعي مناسب للاستخدام اليومي.",   price: 45, oldPrice: null, size: "1 لتر",    image: "assets/images/products/milk-1.svg",        available: true,  featured: true,  onSale: false },
  { id: 2,  name: "زبادي طبيعي",             category: "yogurt", description: "زبادي سادة لوجبات الفطار والعشاء.",     price: 15, oldPrice: null, size: "200 جرام", image: "assets/images/products/yogurt-1.svg",      available: true,  featured: true,  onSale: false },
  { id: 3,  name: "جبنة بيضاء",              category: "cheese", description: "جبنة بيضاء طرية للفطار والسندويتشات.",  price: 70, oldPrice: null, size: "500 جرام", image: "assets/images/products/cheese-white.svg",  available: true,  featured: true,  onSale: false },
  { id: 4,  name: "عصير برتقال",             category: "juice",  description: "عصير برتقال بارد في زجاجة صغيرة.",      price: 25, oldPrice: null, size: "250 مل",   image: "assets/images/products/juice-orange.svg",  available: true,  featured: true,  onSale: false },
  { id: 5,  name: "حليب بالشوكولاتة",        category: "milk",   description: "حليب بنكهة الشوكولاتة للصغار والكبار.", price: 18, oldPrice: 22,   size: "250 مل",   image: "assets/images/products/milk-choc.svg",     available: true,  featured: true,  onSale: true  },
  { id: 6,  name: "جبنة رومي",               category: "cheese", description: "جبنة رومي بطعم مميز.",                  price: 85, oldPrice: null, size: "250 جرام", image: "assets/images/products/cheese-romy.svg",   available: true,  featured: true,  onSale: false },
  { id: 7,  name: "زبادي بالفراولة",         category: "yogurt", description: "زبادي بنكهة الفراولة.",                 price: 12, oldPrice: 15,   size: "150 جرام", image: "assets/images/products/yogurt-straw.svg",  available: true,  featured: true,  onSale: true  },
  { id: 8,  name: "عصير مانجو",              category: "juice",  description: "عصير مانجو في عبوة عائلية.",            price: 35, oldPrice: 42,   size: "1 لتر",    image: "assets/images/products/juice-mango.svg",   available: true,  featured: true,  onSale: true  },
  { id: 9,  name: "قشطة",                    category: "milk",   description: "قشطة كريمية للحلويات والفطار.",         price: 40, oldPrice: null, size: "200 جرام", image: "assets/images/products/cream.svg",         available: true,  featured: false, onSale: false },
  { id: 10, name: "زبدة",                    category: "milk",   description: "زبدة للطبخ والفطار.",                   price: 65, oldPrice: null, size: "200 جرام", image: "assets/images/products/butter.svg",        available: true,  featured: false, onSale: false },
  { id: 11, name: "جبنة شيدر",               category: "cheese", description: "جبنة شيدر للسندويتشات والمخبوزات.",     price: 80, oldPrice: 90,   size: "250 جرام", image: "assets/images/products/cheese-cheddar.svg", available: true,  featured: false, onSale: true  },
  { id: 12, name: "زبادي طبيعي حجم عائلي",   category: "yogurt", description: "عبوة كبيرة من الزبادي الطبيعي.",        price: 55, oldPrice: null, size: "1 كجم",    image: "assets/images/products/yogurt-big.svg",    available: false, featured: false, onSale: false },
  { id: 13, name: "عصير فراولة",             category: "juice",  description: "عصير فراولة بارد في زجاجة صغيرة.",      price: 25, oldPrice: null, size: "250 مل",   image: "assets/images/products/juice-straw.svg",   available: true,  featured: false, onSale: false }
];
