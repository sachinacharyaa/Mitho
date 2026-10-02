const repository = require("./repository");
const service = require("./service");
const { bcrypt } = require("./auth");

const photo = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

const images = {
    dumplings: photo("1496116218417-1a781b1c416c"),
    noodles: photo("1569718212165-3a8278d5f624"),
    thali: photo("1546833999-b9f581a1996d"),
    biryani: photo("1563379091339-03b21ab4a4f8"),
    burger: photo("1568901346375-23c9450c58cd"),
    fries: photo("1576107232684-1279f390859f"),
    pizza: photo("1513104890138-7c749659a591"),
    sushi: photo("1579871494447-9811cf80d66c"),
    tea: photo("1556679343-c7306c1976bc"),
    coffee: photo("1495474472287-4d71bcdd2085"),
    drink: photo("1544145945-f90425340c7e"),
    dessert: photo("1551024601-bec78aea704b"),
    chicken: photo("1598103442097-8b74394b95c6"),
    bread: photo("1509440152774-6ef0d3c0d0c3")
};

function dish(name, description, price, category, image) {
    return { name, description, price, category, image, available: true };
}

async function ensureAdmin() {
    const existing = await repository.findOne("admins", { email: "admin@mitho.com" });
    if (existing) return existing;
    return repository.insert("admins", {
        email: "admin@mitho.com",
        password: await bcrypt.hash("mitho123", 8),
        firstName: "Nabin",
        lastName: "Adhikari",
        role: "admin",
        active: true
    });
}

async function seedIfEmpty() {
    await ensureAdmin();
    if (await repository.count("users")) return;
    const password = "mitho123";

    const customer = await service.signup({
        role: "customer",
        name: "Aarav Sharma",
        email: "aarav@mitho.com",
        phone: "9801000001",
        address: "Lainchaur, Kathmandu",
        password
    });
    const admin = await ensureAdmin();
    const rita = await service.signup({
        role: "rider",
        name: "Rita Tamang",
        email: "rita@mitho.com",
        phone: "9801000002",
        vehicleType: "Scooter",
        vehicleNumber: "Ba 2 Kha 4488",
        zone: "Kathmandu",
        password
    });
    await service.signup({
        role: "rider",
        name: "Suman Shrestha",
        email: "suman@mitho.com",
        phone: "9801000003",
        vehicleType: "Cycle",
        vehicleNumber: "Ba 3 Cha 2210",
        zone: "Lalitpur",
        password
    });
    await service.updateRider(
        (await repository.findOne("riders", { email: "suman@mitho.com" }))._id,
        { status: "offline" }
    );

    const kitchens = [
        ["Momo House", "Maya Gurung", "kitchen@momohouse.com", "9801111001", "Thamel Marg, Kathmandu", "Momo", 49, 25, 4.8, 126, "#C2410C", images.dumplings, "open"],
        ["Thakali Kitchen", "Pemba Sherpa", "hello@thakalikitchen.com", "9801111002", "Jhamsikhel Rd, Lalitpur", "Thakali", 69, 35, 4.7, 98, "#B45309", images.thali, "open"],
        ["Biryani Darbar", "Asha Rai", "orders@biryanidarbar.com", "9801111003", "Baneshwor, Kathmandu", "Indian", 59, 40, 4.6, 84, "#9A3412", images.biryani, "open"],
        ["Burger Barn", "Bikash Shrestha", "hi@burgerbarn.com", "9801111004", "Durbar Marg, Kathmandu", "Burger", 49, 20, 4.4, 88, "#B91C1C", images.burger, "open"],
        ["Pizza Roma", "Renu Maharjan", "ciao@pizzaroma.com", "9801111005", "Patan Dhoka, Lalitpur", "Pizza", 79, 30, 4.5, 73, "#C2410C", images.pizza, "open"],
        ["Nori Room", "Sujan Tamang", "hello@noriroom.com", "9801111006", "Lazimpat, Kathmandu", "Japanese", 89, 35, 4.9, 61, "#1F6B4F", images.sushi, "open"],
        ["Chiya Ghar", "Kamala Lama", "hi@chiyaghar.com", "9801111007", "Boudha, Kathmandu", "Cafe", 39, 15, 4.3, 54, "#92400E", images.tea, "closed"]
    ];

    const owners = {};
    for (const row of kitchens) {
        const [name, ownerName, email, phone, address, cuisine, deliveryFee, etaMinutes, rating, ratingCount, accent, image, status] = row;
        const signed = await service.signup({
            role: "restaurant",
            name, ownerName, email, phone, address, cuisine, password
        });
        await service.decorateRestaurant(signed.user.id, {
            deliveryFee, etaMinutes, rating, ratingCount, accent,
            image, coverImage: image, status
        });
        owners[name] = signed.user.id;
    }

    const menus = {
        "Momo House": [
            dish("Chicken steam momo", "Ten pieces with tomato achar.", 220, "Steamed", images.dumplings),
            dish("Buff steam momo", "Valley-style buff, chili oil on the side.", 200, "Steamed", images.dumplings),
            dish("Jhol momo", "Chicken momo in a sesame-tomato broth.", 260, "Steamed", images.dumplings),
            dish("Chicken fried momo", "Crisp bottoms, soft filling.", 240, "Fried", images.dumplings),
            dish("Veg steam momo", "Cabbage, tofu, and ginger.", 180, "Steamed", images.dumplings),
            dish("Chicken thukpa", "Slow broth, chili, and noodles.", 240, "Soups", images.noodles),
            dish("Milk tea", "Sweet, milky, and hot.", 40, "Drinks", images.tea)
        ],
        "Thakali Kitchen": [
            dish("Dal bhat tarkari", "The day's curry with refillable dal and rice.", 420, "Meals", images.thali),
            dish("Chicken dal bhat", "Dal bhat with grilled chicken thigh.", 540, "Meals", images.chicken),
            dish("Mutton thakali set", "Slow-cooked mutton, rice, and greens.", 690, "Meals", images.thali),
            dish("Dhido set", "Buckwheat dhido with gundruk.", 380, "Meals", images.thali),
            dish("Gundruk ko achar", "Fermented greens, sharp and bright.", 80, "Sides", images.thali),
            dish("Masala chiya", "Cardamom, ginger, and milk.", 50, "Drinks", images.tea),
            dish("Lassi", "Cold and lightly sweet.", 120, "Drinks", images.drink)
        ],
        "Biryani Darbar": [
            dish("Chicken biryani", "Dum rice, saffron, and raita.", 380, "Biryani", images.biryani),
            dish("Mutton biryani", "Deep and fragrant, for a hungry table.", 480, "Biryani", images.biryani),
            dish("Veg biryani", "Seasonal vegetables and basmati.", 320, "Biryani", images.biryani),
            dish("Chicken tikka", "Charred, yogurt-marinated, four pieces.", 340, "Kebabs", images.chicken),
            dish("Butter naan", "Warm, brushed with butter.", 60, "Breads", images.bread),
            dish("Raita", "Cucumber and cumin yogurt.", 70, "Sides", images.thali),
            dish("Mango lassi", "Thick, cold, and sweet.", 140, "Drinks", images.drink)
        ],
        "Burger Barn": [
            dish("Classic smash", "Two thin patties, american cheese, pickles.", 320, "Burgers", images.burger),
            dish("Spicy chicken", "Buttermilk chicken, chili mayo.", 340, "Burgers", images.chicken),
            dish("Mushroom swiss", "Smashed patty, swiss, garlic mushrooms.", 360, "Burgers", images.burger),
            dish("Fries", "Salted, crisp, shareable.", 140, "Sides", images.fries),
            dish("Onion rings", "Beer batter, hot from the fryer.", 160, "Sides", images.fries),
            dish("Chocolate shake", "Thick, cocoa, no fuss.", 180, "Drinks", images.drink),
            dish("Lemon soda", "Fresh lemon and soda.", 90, "Drinks", images.drink)
        ],
        "Pizza Roma": [
            dish("Margherita", "Tomato, fior di latte, basil.", 520, "Pizza", images.pizza),
            dish("Pepperoni", "Cupping pepperoni and mozzarella.", 690, "Pizza", images.pizza),
            dish("Mushroom olive", "Roasted mushroom, olive, thyme.", 640, "Pizza", images.pizza),
            dish("Paneer tikka pizza", "Tandoori paneer and peppers.", 670, "Pizza", images.pizza),
            dish("Garlic bread", "Butter, garlic, parsley.", 180, "Sides", images.bread),
            dish("Tiramisu", "Espresso, mascarpone, cocoa.", 240, "Dessert", images.dessert)
        ],
        "Nori Room": [
            dish("Salmon nigiri", "Four pieces, cool rice, fresh salmon.", 480, "Nigiri", images.sushi),
            dish("Tuna roll", "Eight pieces with cucumber.", 420, "Rolls", images.sushi),
            dish("Veg maki", "Avocado, cucumber, pickled radish.", 320, "Rolls", images.sushi),
            dish("Chicken katsu", "Panko chicken, cabbage, tonkatsu sauce.", 540, "Mains", images.chicken),
            dish("Miso soup", "Tofu, wakame, scallion.", 160, "Soups", images.noodles),
            dish("Green tea", "Hot, unsweetened.", 100, "Drinks", images.tea)
        ],
        "Chiya Ghar": [
            dish("Milk tea", "The house chiya.", 40, "Tea", images.tea),
            dish("Black coffee", "Short and strong.", 120, "Coffee", images.coffee),
            dish("Sel roti", "A ring of sweet rice bread.", 80, "Snacks", images.bread),
            dish("Samosa", "Two pieces, pea and potato.", 50, "Snacks", images.fries),
            dish("Egg puff", "Bakery-style and warm.", 70, "Snacks", images.bread),
            dish("Aloo chop", "Spiced potato cake.", 60, "Snacks", images.fries)
        ]
    };

    const ids = {};
    for (const [kitchen, items] of Object.entries(menus)) {
        for (const item of items) {
            const saved = await service.addMenuItem(owners[kitchen], item);
            ids[`${kitchen}:${item.name}`] = saved.id;
        }
    }

    const address = "Lainchaur, Kathmandu";
    const burger = await service.placeOrder(customer.user.id, {
        restaurantId: owners["Burger Barn"],
        deliveryType: "delivery",
        deliveryAddress: address,
        method: "eSewa",
        note: "",
        items: [
            { foodItemId: ids["Burger Barn:Classic smash"], quantity: 1 },
            { foodItemId: ids["Burger Barn:Chocolate shake"], quantity: 1 }
        ]
    });
    let current = burger;
    for (const status of ["confirmed", "preparing", "ready_for_pickup"]) {
        current = await service.restaurantSetStatus(owners["Burger Barn"], current.id, status);
    }
    current = await service.riderAccept(rita.user.id, current.id);
    current = await service.riderAdvance(rita.user.id, current.id, "out_for_delivery");
    current = await service.riderAdvance(rita.user.id, current.id, "delivered");
    await service.addReview(customer.user.id, current.id, {
        rating: 5,
        comment: "Smashed thin and juicy. The shake was properly cold."
    });

    const biryani = await service.placeOrder(customer.user.id, {
        restaurantId: owners["Biryani Darbar"],
        deliveryType: "delivery",
        deliveryAddress: address,
        method: "Khalti",
        note: "Leave it with the guard if I'm not at the door.",
        items: [
            { foodItemId: ids["Biryani Darbar:Chicken biryani"], quantity: 1 },
            { foodItemId: ids["Biryani Darbar:Butter naan"], quantity: 2 }
        ]
    });
    current = biryani;
    for (const status of ["confirmed", "preparing", "ready_for_pickup"]) {
        current = await service.restaurantSetStatus(owners["Biryani Darbar"], current.id, status);
    }

    await service.placeOrder(customer.user.id, {
        restaurantId: owners["Momo House"],
        deliveryType: "delivery",
        deliveryAddress: address,
        method: "Cash on Delivery",
        note: "Extra spicy achar please.",
        items: [
            { foodItemId: ids["Momo House:Chicken steam momo"], quantity: 1 },
            { foodItemId: ids["Momo House:Jhol momo"], quantity: 1 }
        ]
    });

    void admin;
    const restaurants = await repository.count("restaurants");
    const foods = await repository.count("foodItems");
    console.log(`Seeded demo kitchens (${restaurants}) and dishes (${foods}). Password for every demo login: mitho123`);
}

module.exports = { seedIfEmpty };
