import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// FIX: Define a specific type for traceability records to improve type safety and resolve type errors.
interface TraceabilityRecord {
    batchId: string;
    productName: string;
    farm: {
        name: string;
        mapEmbedUrl: string;
        harvestDate: string;
    };
    milling: {
        date: string;
        facility: string;
    };
    logistics: {
        mode: string;
        departure: string;
        arrival: string;
    };
    packagingAndStorage: {
        packagingDate: string;
        material: string;
        warehouse: string;
        conditions: string;
    };
    quality: {
        moisture: string;
        brokenGrains: string;
        purity: string;
        avgGrainLength: string;
        grade: string;
        testedBy: string;
    };
    certifications: string;
}

// --- DATA PROCESSING MODULE --- //
// This module contains the logic for processing the raw CSV data into structured objects.
const DataProcessor = (() => {
    const farmDefinitions = {
        'Chattisgarh': { name: 'Verma Agri-Group, Raipur', mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7580695.815999384!2d78.53761369531248!3d21.2786566!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a28c2138c213e4b%3A0x952a1b6db421a1f!2sChhattisgarh!5e0!3m2!1sen!2sin!4v1716908616339!5m2!1sen!2sin' },
        'Miryalaguda': { name: 'Reddy Organic Farms, Nalgonda', mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d61314.99009893992!2d79.542918833907!3d16.876115900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb036443567793%3A0x6515942416e75551!2sMiryalaguda%2C%20Telangana!5e0!3m2!1sen!2sin!4v1716908681571!5m2!1sen!2sin' },
        'Kakinada': { name: 'Coastal Paddy Fields, East Godavari', mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d122217.33446864115!2d82.17937748498595!3d16.9715993!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3827ddaf732f83%3A0x4cb1995c52251817!2sKakinada%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1716908713451!5m2!1sen!2sin' },
        'Warangal': { name: 'Kakatiya Growers Co-op, Warangal', mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d243646.2384112185!2d79.46213038662998!3d17.975494800000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a334f3d17631d1b%3A0x9f58169a97a3b839!2sWarangal%2C%20Telangana!5e0!3m2!1sen!2sin!4v1716908743125!5m2!1sen!2sin' },
    };
    const plantDefinitions = {
        'Chattisgarh': { facility: 'MKRM Plant #1' },
        'Miryalaguda': { facility: 'MKRM Plant #2' },
        'Kakinada': { facility: 'MKRM Plant #3' },
        'Warangal': { facility: 'MKRM Plant #4' },
    };
    const riceTypeDefinitions = {
        'SonaMasoori': { name: 'Sona Masoori Rice', grade: 'Premium Quality' },
        'Broken Rice': { name: 'Broken White Rice', grade: 'Standard Grade' },
        'JaiSriRam': { name: 'Jai Sri Ram Premium Rice', grade: 'Superior Grade' },
        'Basmathi': { name: 'Extra-Long Grain Basmati', grade: 'USDA Grade A' },
    };
    const certificationDefinitions = [
        '100% Organic, FSSAI License #123-456-7890',
        'Fair Trade Certified, ISO 9001:2015',
        'Non-GMO Project Verified, FSSAI #987-654-3210',
        'Gluten-Free Certified, ISO 22000',
    ];

    const getRandom = (min, max, decimals = 1) => (Math.random() * (max - min) + min).toFixed(decimals);

    const generateTraceabilityRecord = (batchId) => {
        const parts = batchId.match(/MKRM-([a-zA-Z\s]+)(\d+)-(\d{4})-([a-zA-Z]+)(\d+)/);
        if (!parts) return null;

        const [, riceKey, , year, locationKey] = parts;

        // FIX: Use riceKey directly, as cleanRiceKey was buggy for names with spaces.
        const riceInfo = riceTypeDefinitions[riceKey.replace(/\s/g, '')] || riceTypeDefinitions[riceKey] || { name: 'Standard Rice', grade: 'Standard' };
        const farmInfo = farmDefinitions[locationKey] || { name: 'Unknown Farm', mapEmbedUrl: '' };
        const plantInfo = plantDefinitions[locationKey] || { facility: 'MKRM Plant #0' };
        
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const formatDate = (date) => `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

        // Generate consistent, chronological dates
        const randomDayOfYear = parseInt(getRandom(60, 300, 0)); // Avoid start/end of year for simplicity
        const millingDate = new Date(year, 0, randomDayOfYear);
        
        const harvestDate = new Date(millingDate);
        harvestDate.setDate(harvestDate.getDate() - parseInt(getRandom(20, 45, 0)));

        const departureDate = new Date(millingDate);
        departureDate.setDate(departureDate.getDate() + 1);

        const arrivalDate = new Date(departureDate);
        arrivalDate.setDate(arrivalDate.getDate() + parseInt(getRandom(2, 4, 0)));

        const packagingDate = new Date(arrivalDate);
        packagingDate.setDate(packagingDate.getDate() + 1);


        return {
            batchId: batchId,
            productName: riceInfo.name,
            farm: { 
                name: farmInfo.name, 
                mapEmbedUrl: farmInfo.mapEmbedUrl,
                harvestDate: formatDate(harvestDate),
            },
            milling: {
                date: formatDate(millingDate),
                facility: `${plantInfo.facility} (${locationKey})`,
            },
            logistics: {
                mode: 'GPS-tracked, Temperature-controlled truck',
                departure: formatDate(departureDate),
                arrival: formatDate(arrivalDate),
            },
            packagingAndStorage: {
                packagingDate: formatDate(packagingDate),
                material: '5-ply BOPP woven bag, Nitrogen flushed',
                warehouse: `MKRM Central Warehouse, ${locationKey}`,
                conditions: 'Temp: < 18°C, Humidity: < 60%',
            },
            quality: {
                moisture: `${getRandom(12.5, 14.0)}%`,
                brokenGrains: `${getRandom(0.5, 4.5)}%`,
                purity: `${getRandom(99.5, 99.9)}%`,
                avgGrainLength: riceKey === 'Basmathi' ? `${getRandom(7.0, 8.4)}mm` : 'N/A',
                grade: riceInfo.grade,
                testedBy: 'MKRM Central Quality Lab',
            },
            certifications: certificationDefinitions[millingDate.getDate() % certificationDefinitions.length],
        };
    };


    const processCsvData = (csvText) => {
        // FIX: Remove potential BOM character from the start of the file
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1);
        }
        const batchIdList = csvText.split('\n').filter(id => id.trim() !== '' && !id.startsWith('http'));
        return batchIdList.reduce((acc, id) => {
            const record = generateTraceabilityRecord(id.trim());
            if (record) acc[id.trim()] = record;
            return acc;
        }, {});
    };

    return { processCsvData };
})();

// --- ANALYTICS SERVICE --- //
const AnalyticsService = (() => {
    // This service "logs" events by printing them to the console.
    // This simulates sending data to a real analytics backend without making API calls
    // that could be rate-limited, thus preventing API errors.
    const sendEvent = async (event) => {
        console.log(`--- SIMULATED ANALYTICS EVENT ---`);
        console.log(`Type: ${event.type}`);
        console.log('Data:', event);
        console.log(`--- END ANALYTICS EVENT ---`);
    };
    return { sendEvent };
})();

const USD_TO_INR_RATE = 83.5;

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
};


// --- EMAIL SERVICE (SIMULATED) --- //
const EmailService = (() => {
    const sendOrderConfirmation = async (customerDetails, order) => {
        // This is a simulation. In a real app, you would use a service like SendGrid.
        // We generate a canned message instead of calling an API to avoid rate limits.
        const emailBody = `
Dear ${customerDetails.name},

Thank you for your order with MKRM Rice!

We've successfully received your order #${order.id}, placed on ${order.date}.

Here is a summary of your order:
${order.items.map(item => `- ${item.quantity} x ${item.name} (${formatCurrency(item.price)})`).join('\n')}

Subtotal: ${formatCurrency(order.subtotal)}
Taxes (18% GST): ${formatCurrency(order.taxes)}
Total: ${formatCurrency(order.total)}

Shipping to:
${customerDetails.name}
${customerDetails.address}
${customerDetails.city}, ${customerDetails.state} ${customerDetails.zip}
India

Your order is being processed and will be shipped within 2 business days. You will receive another email with tracking information once it ships.

We appreciate your business!

Sincerely,
The MKRM Rice Team
`;
        await AnalyticsService.sendEvent({
            type: 'EMAIL_SENT',
            emailType: 'ORDER_CONFIRMATION',
            recipient: customerDetails.email,
            orderId: order.id,
            emailBody, // In a real scenario, you might only log metadata
        });

        // Simulating the "send" operation
        console.log("--- SIMULATED EMAIL SENT ---");
        console.log(`To: ${customerDetails.email}`);
        console.log(`Subject: Your MKRM Rice Order Confirmation #${order.id}`);
        console.log(emailBody);
        console.log("--- END SIMULATED EMAIL ---");
    };
    return { sendOrderConfirmation };
})();

// --- PRICE ESTIMATOR SERVICE --- //
const PriceEstimatorService = (() => {
    // FIX: Use process.env.API_KEY to align with the Gemini API coding guidelines and resolve TypeScript errors.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const estimatePrice = async (riceType, quantity, region, season) => {
        // Fallback logic for offline/error cases
        const fallbackPrice = () => {
            const basePrices = { 'Sona Masoori Rice': 5500, 'Broken White Rice': 3000, 'Jai Sri Ram Premium Rice': 6500, 'Extra-Long Grain Basmati': 11000 };
            const base = basePrices[riceType] || 5000;
            const pricePerQuintal = base * (1 + (new Date().getMonth() % 3) * 0.05); // Simplified season effect
            return {
                estimatedPriceINR: pricePerQuintal * (quantity / 100),
                pricePerQuintal: pricePerQuintal,
                reason: 'Price estimated using standard market rates (AI model offline).',
            };
        };

        // FIX: Use process.env.API_KEY to align with the Gemini API coding guidelines and resolve TypeScript errors.
        if (!process.env.API_KEY) {
            console.warn("API_KEY not found. Using fallback price estimator.");
            return fallbackPrice();
        }

        try {
            const prompt = `Estimate the wholesale price for ${quantity} quintals of "${riceType}" rice from the ${region} region of India during the ${season} season. Provide the total estimated price in INR, the price per quintal in INR, and a brief justification for the price based on factors like rice type, grade, region, season, and market trends.`;
            
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    estimatedPriceINR: {
                        type: Type.NUMBER,
                        description: 'Total estimated price in Indian Rupees for the given quantity.'
                    },
                    pricePerQuintal: {
                        type: Type.NUMBER,
                        description: 'The calculated price per quintal (100 kg) in Indian Rupees.'
                    },
                    reason: {
                        type: Type.STRING,
                        description: 'A brief explanation of the factors affecting the price.'
                    },
                },
                required: ['estimatedPriceINR', 'pricePerQuintal', 'reason'],
            };

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.2,
                },
            });
            
            // FIX: Add robust JSON parsing to handle markdown code fences from the model
            let jsonStr = result.text.trim();
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
            }
            const data = JSON.parse(jsonStr);


            return {
                estimatedPriceINR: data.estimatedPriceINR,
                pricePerQuintal: data.pricePerQuintal,
                reason: data.reason,
            };
        } catch (error) {
            console.error("Error estimating price with Gemini API:", error);
            return fallbackPrice();
        }
    };
    return { estimatePrice };
})();


// --- MOCK PRODUCT DATA --- //
const PRODUCTS = [
    { id: 1, name: 'Sona Masoori Rice', priceINR: 5800, image: 'https://images.unsplash.com/photo-1586201375765-c124a275f05b?q=80&w=400&auto=format&fit=crop', description: 'Premium quality, aged Sona Masoori rice. Perfect for daily meals.' },
    { id: 2, name: 'Broken White Rice', priceINR: 3200, image: 'https://images.unsplash.com/photo-1512103869192-1f3f96f02d4d?q=80&w=400&auto=format&fit=crop', description: 'Economical choice for porridges and traditional dishes.' },
    { id: 3, name: 'Jai Sri Ram Premium Rice', priceINR: 6900, image: 'https://images.unsplash.com/photo-1589578228257-ca6418837a53?q=80&w=400&auto=format&fit=crop', description: 'Aromatic and flavorful, ideal for special occasions.' },
    { id: 4, name: 'Extra-Long Grain Basmati', priceINR: 11500, image: 'https://images.unsplash.com/photo-1603202976788-b43a504a5a5c?q=80&w=400&auto=format&fit=crop', description: 'The finest Basmati for biryani and pulao, aged for 2 years.' },
];

const App = () => {
    const [page, setPage] = useState('shop');
    const [cart, setCart] = useState([]);
    const [orders, setOrders] = useState([]);
    // FIX: Use a specific interface for traceabilityData for better type safety. This resolves type inference issues down the line.
    const [traceabilityData, setTraceabilityData] = useState<Record<string, TraceabilityRecord>>({});
    
    useEffect(() => {
        const fetchTraceData = async () => {
            try {
                const response = await fetch('/data.csv');
                const csvText = await response.text();
                const data = DataProcessor.processCsvData(csvText);
                setTraceabilityData(data);
            } catch(e) {
                console.error("Failed to load traceability data:", e);
            }
        };
        fetchTraceData();
    }, []);

    const addToCart = (product, quantity) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevCart, { ...product, quantity }];
        });
        AnalyticsService.sendEvent({ type: 'ADD_TO_CART', productId: product.id, quantity: quantity, productName: product.name });
    };
    
    const updateCartQuantity = (productId, newQuantity) => {
        setCart(prevCart => {
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== productId);
            }
            return prevCart.map(item =>
                item.id === productId ? { ...item, quantity: newQuantity } : item
            );
        });
    };

    const placeOrder = (orderDetails) => {
        const subtotal = cart.reduce((sum, item) => sum + item.priceINR * item.quantity, 0);
        const taxes = subtotal * 0.18;
        const total = subtotal + taxes;

        const newOrder = {
            id: `MKRM-${Date.now()}`,
            date: new Date().toLocaleDateString('en-GB'),
            items: cart,
            subtotal,
            taxes,
            total,
            shippingDetails: orderDetails
        };
        setOrders(prevOrders => [newOrder, ...prevOrders]);
        setCart([]);
        EmailService.sendOrderConfirmation(orderDetails, newOrder);
        AnalyticsService.sendEvent({ type: 'ORDER_PLACED', orderId: newOrder.id, total: total });
        setPage('orders');
    };

    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    return (
        <>
            <Header page={page} setPage={setPage} cartCount={cartCount} />
            <main>
                {page === 'shop' && <ProductList products={PRODUCTS} addToCart={addToCart} />}
                {page === 'trace' && <Traceability traceabilityData={traceabilityData} />}
                {page === 'estimate' && <PriceEstimator />}
                {page === 'convert' && <PaddyConverter />}
                {page === 'cart' && <Cart cart={cart} updateCartQuantity={updateCartQuantity} setPage={setPage} />}
                {page === 'checkout' && <Checkout placeOrder={placeOrder} cart={cart} />}
                {page === 'orders' && <OrderHistory orders={orders} setPage={setPage} />}
            </main>
            <Chatbot products={PRODUCTS} traceabilityData={traceabilityData} />
            <Footer setPage={setPage} />
        </>
    );
};

const Header = ({ page, setPage, cartCount }) => (
    <header className="app-header">
        <div className="logo" onClick={() => setPage('shop')}>MKRM Rice</div>
        <nav className="navigation">
            <a onClick={() => setPage('shop')} className={page === 'shop' ? 'active' : ''}>Shop</a>
            <a onClick={() => setPage('trace')} className={page === 'trace' ? 'active' : ''}>Traceability</a>
            <a onClick={() => setPage('estimate')} className={page === 'estimate' ? 'active' : ''}>Price Estimator</a>
            <a onClick={() => setPage('convert')} className={page === 'convert' ? 'active' : ''}>Paddy Converter</a>
            <a onClick={() => setPage('orders')} className={page === 'orders' ? 'active' : ''}>My Orders</a>
            <a onClick={() => setPage('cart')} className={page === 'cart' ? 'active' : ''}>
                <span className="cart-indicator">
                    Cart {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
                </span>
            </a>
        </nav>
    </header>
);

const ProductList = ({ products, addToCart }) => {
    return (
        <div className="page-container">
            <h1 className="page-title">Our Premium Rice Selection</h1>
            <div className="product-grid">
                {products.map(product => <ProductCard key={product.id} product={product} addToCart={addToCart} />)}
            </div>
        </div>
    );
};

const ProductCard = ({ product, addToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const handleAddToCart = () => {
        addToCart(product, quantity);
    };

    return (
        <div className="product-card">
            <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
            <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">{formatCurrency(product.priceINR)} / quintal</p>
                <p>{product.description}</p>
                <button onClick={handleAddToCart} className="btn add-to-cart-btn">Add to Cart</button>
            </div>
        </div>
    );
};

const Traceability = ({ traceabilityData }) => {
    const [batchId, setBatchId] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const foundRecord = traceabilityData[batchId.trim()];
        if (foundRecord) {
            setResult(foundRecord);
            setError('');
            AnalyticsService.sendEvent({ type: 'TRACEABILITY_SEARCH', batchId: batchId.trim(), result: 'found' });
        } else {
            setResult(null);
            setError('Batch ID not found. Please check the ID and try again.');
            AnalyticsService.sendEvent({ type: 'TRACEABILITY_SEARCH', batchId: batchId.trim(), result: 'not_found' });
        }
    };
    
    return (
        <div className="page-container trace-container">
            <h1 className="page-title">Product Traceability</h1>
            <p style={{textAlign: 'center', marginBottom: '2rem'}}>Enter the Batch ID found on your MKRM Rice packaging to trace its journey from farm to you. Try: <strong>MKRM-SonaMasoori23-2024-Chattisgarh8</strong></p>
            <form className="trace-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="trace-input"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    placeholder="Enter Batch ID (e.g., MKRM-SonaMasoori23-2024-Chattisgarh8)"
                    aria-label="Batch ID"
                />
                <button type="submit" className="btn">Trace</button>
            </form>
            {error && <p className="error-message">{error}</p>}
            {result && <TraceabilityResult result={result} />}
        </div>
    );
};

const TraceabilityResult = ({ result }) => {
    const timelineItems = [
        {
            icon: '🌾', title: 'Farming & Harvest', details: [
                { label: 'Farm Name', value: result.farm.name },
                { label: 'Harvest Date', value: result.farm.harvestDate },
            ], map: result.farm.mapEmbedUrl
        },
        {
            icon: '🏭', title: 'Milling & Processing', details: [
                { label: 'Milling Date', value: result.milling.date },
                { label: 'Processing Facility', value: result.milling.facility },
            ]
        },
        {
            icon: '🚚', title: 'Logistics', details: [
                { label: 'Transport Mode', value: result.logistics.mode },
                { label: 'Departure from Mill', value: result.logistics.departure },
                { label: 'Arrival at Warehouse', value: result.logistics.arrival },
            ]
        },
        {
            icon: '📦', title: 'Packaging & Storage', details: [
                { label: 'Packaging Date', value: result.packagingAndStorage.packagingDate },
                { label: 'Packaging Material', value: result.packagingAndStorage.material },
                { label: 'Storage Warehouse', value: result.packagingAndStorage.warehouse },
                { label: 'Storage Conditions', value: result.packagingAndStorage.conditions },
            ]
        },
        {
            icon: '🔬', title: 'Quality Assurance', details: [
                { label: 'Moisture Content', value: result.quality.moisture },
                { label: 'Broken Grains', value: result.quality.brokenGrains },
                { label: 'Purity Level', value: result.quality.purity },
                { label: 'Avg. Grain Length', value: result.quality.avgGrainLength },
                { label: 'Grade', value: result.quality.grade },
                { label: 'Tested By', value: result.quality.testedBy },
            ]
        },
         {
            icon: '📜', title: 'Certifications', details: [
                { label: 'Certification Body', value: result.certifications },
            ]
        }
    ];

    return (
        <div className="trace-results">
            <h2 style={{textAlign: 'center'}}>{result.productName}</h2>
            <h3 style={{textAlign: 'center'}}>Batch ID: {result.batchId}</h3>
            <div className="timeline">
                {timelineItems.map((item, index) => (
                    <div key={index} className="timeline-item">
                        <h4><span className="timeline-icon" aria-hidden="true">{item.icon}</span> {item.title}</h4>
                        {item.details.map((detail, i) => (
                           <p key={i}><strong>{detail.label}:</strong> {detail.value}</p>
                        ))}
                        {item.map && (
                            <div className="map-container">
                                <iframe
                                    src={item.map}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title={`Map of ${result.farm.name}`}
                                ></iframe>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const PriceEstimator = () => {
    const [formData, setFormData] = useState({
        riceType: 'Sona Masoori Rice',
        quantity: 100,
        region: 'Kakinada',
        season: 'Kharif',
    });
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResult(null);
        try {
            const estimatedPrice = await PriceEstimatorService.estimatePrice(formData.riceType, formData.quantity, formData.region, formData.season);
            setResult(estimatedPrice);
            AnalyticsService.sendEvent({ type: 'PRICE_ESTIMATION', formData, result: 'success' });
        } catch (err) {
            setError('Failed to get an estimate. Please try again later.');
            AnalyticsService.sendEvent({ type: 'PRICE_ESTIMATION', formData, result: 'error', error: err.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="page-container estimator-container">
            <h1 className="page-title">Wholesale Price Estimator</h1>
            <p style={{textAlign: 'center', marginBottom: '2rem'}}>Get a real-time price estimate for bulk rice orders powered by our AI model.</p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="riceType">Rice Variety</label>
                    <select id="riceType" name="riceType" value={formData.riceType} onChange={handleChange} required>
                        <option>Sona Masoori Rice</option>
                        <option>Broken White Rice</option>
                        <option>Jai Sri Ram Premium Rice</option>
                        <option>Extra-Long Grain Basmati</option>
                    </select>
                </div>
                 <div className="form-group">
                    <label htmlFor="quantity">Quantity (in Quintals)</label>
                    <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required />
                </div>
                <div className="form-group">
                    <label htmlFor="region">Region</label>
                     <select id="region" name="region" value={formData.region} onChange={handleChange} required>
                        <option>Chattisgarh</option>
                        <option>Kakinada</option>
                        <option>Miryalaguda</option>
                        <option>Warangal</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="season">Season</label>
                     <select id="season" name="season" value={formData.season} onChange={handleChange} required>
                        <option>Kharif (Monsoon)</option>
                        <option>Rabi (Winter)</option>
                    </select>
                </div>
                <button type="submit" className="btn" disabled={isLoading}>{isLoading ? 'Estimating...' : 'Get Estimate'}</button>
            </form>
            {error && <p className="error-message">{error}</p>}
            {result && (
                <div className="estimator-result">
                    <h3>Estimated Wholesale Price</h3>
                    <div className="estimated-price">
                        <span>{formatCurrency(result.estimatedPriceINR)}</span> for {formData.quantity} Quintals
                    </div>
                    <p className="price-details">
                       Approx. <strong>{formatCurrency(result.pricePerQuintal)}</strong> per quintal
                    </p>
                    <p className="reason"><strong>Justification:</strong> {result.reason}</p>
                    <button className="btn btn-secondary" onClick={() => alert('This would lead to a B2B order portal.')}>Place Wholesale Order</button>
                </div>
            )}
        </div>
    );
};

const PaddyConverter = () => {
    const [paddyAmount, setPaddyAmount] = useState(100);
    const [result, setResult] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        const rawRiceYield = paddyAmount * 0.68; // 68% yield
        const brokenRiceYield = paddyAmount * 0.05; // 5% by-product
        const rawRiceValue = rawRiceYield * (4500 / 100); // Avg. Rs 45/kg
        const brokenRiceValue = brokenRiceYield * (2500 / 100); // Avg. Rs 25/kg

        setResult({
            rawRice: { yield: rawRiceYield, value: rawRiceValue },
            brokenRice: { yield: brokenRiceYield, value: brokenRiceValue },
            totalValue: rawRiceValue + brokenRiceValue
        });
        AnalyticsService.sendEvent({ type: 'PADDY_CONVERSION_CALCULATION', paddyAmount: paddyAmount });
    };
    
    useEffect(() => {
        // Trigger calculation on initial render
        handleSubmit(new Event('submit'));
    }, []);

    return (
        <div className="page-container converter-container">
            <div className="page-title-container">
                 <h1 className="page-title">Paddy to Rice Converter</h1>
                 <button className="btn btn-secondary" onClick={() => alert('This leads to a portal for farmers.')}>Farmer's Portal</button>
            </div>
           
            <p style={{textAlign: 'center', marginBottom: '2rem'}}>Calculate the estimated yield and market value from raw paddy to finished rice products.</p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="paddyAmount">Amount of Raw Paddy (in Quintals)</label>
                    <input type="number" id="paddyAmount" value={paddyAmount} onChange={e => setPaddyAmount(parseFloat(e.target.value))} min="1" required />
                </div>
                <button type="submit" className="btn">Calculate Yield</button>
            </form>
            {result && (
                <div className="converter-result">
                    <h2>Estimated Yield for {paddyAmount} Quintals of Paddy</h2>
                    <div className="result-grid">
                        <div className="result-card">
                            <h3>Raw Rice Yield</h3>
                            <p className="yield-amount">{result.rawRice.yield.toFixed(2)} Qtl</p>
                            <p className="market-rate">@ ~{formatCurrency(4500)}/Qtl</p>
                            <p className="total-value">{formatCurrency(result.rawRice.value)}</p>
                        </div>
                        <div className="result-card">
                            <h3>Broken Rice Yield</h3>
                            <p className="yield-amount">{result.brokenRice.yield.toFixed(2)} Qtl</p>
                            <p className="market-rate">@ ~{formatCurrency(2500)}/Qtl</p>
                            <p className="total-value">{formatCurrency(result.brokenRice.value)}</p>
                        </div>
                    </div>
                     <div className="result-summary">
                        <h3>Total Estimated Market Value</h3>
                        <p className="total-value-amount">{formatCurrency(result.totalValue)}</p>
                    </div>
                    <p className="disclaimer">* Disclaimer: These calculations are estimates based on average yields (68% raw, 5% broken) and current market rates. Actual values may vary.</p>
                </div>
            )}
        </div>
    );
};


const Cart = ({ cart, updateCartQuantity, setPage }) => {
    const total = cart.reduce((sum, item) => sum + item.priceINR * item.quantity, 0);

    if (cart.length === 0) {
        return (
            <div className="page-container cart-container">
                <h1 className="page-title">Your Cart</h1>
                <div className="empty-cart">
                    <p>Your cart is empty.</p>
                    <button className="btn" onClick={() => setPage('shop')}>Continue Shopping</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container cart-container">
            <h1 className="page-title">Your Cart</h1>
            <div className="cart-items">
                {cart.map(item => (
                    <div key={item.id} className="cart-item">
                        <div className="cart-item-details">
                            <span className="cart-item-info">{item.name}</span>
                            <span className="cart-item-price">{formatCurrency(item.priceINR * item.quantity)}</span>
                        </div>
                        <div className="cart-item-controls">
                            <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="cart-summary">
                <div className="cart-total">Total: {formatCurrency(total)}</div>
                <button className="btn" onClick={() => setPage('checkout')}>Proceed to Checkout</button>
            </div>
        </div>
    );
};

const Checkout = ({ placeOrder, cart }) => {
    const [customerDetails, setCustomerDetails] = useState({
        name: '', email: '', phone: '', address: '', city: '', state: '', zip: ''
    });

    const subtotal = cart.reduce((sum, item) => sum + item.priceINR * item.quantity, 0);
    const taxes = subtotal * 0.18;
    const total = subtotal + taxes;
    
    const handleChange = (e) => {
        setCustomerDetails({ ...customerDetails, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        placeOrder(customerDetails);
    };

    if(cart.length === 0) {
        return <div className="page-container checkout-container"><p className="info-message">Your cart is empty. Please add items before checking out.</p></div>
    }

    return (
        <div className="page-container checkout-container">
            <h1 className="page-title">Checkout</h1>
            <div className="order-summary">
                <h3>Order Summary</h3>
                <ul>
                    {cart.map(item => (
                        <li key={item.id}>{item.quantity} x {item.name} - {formatCurrency(item.priceINR * item.quantity)}</li>
                    ))}
                </ul>
                <p>Subtotal: {formatCurrency(subtotal)}</p>
                <p>Taxes (18% GST): {formatCurrency(taxes)}</p>
                <p><strong>Total: {formatCurrency(total)}</strong></p>
            </div>
            <hr style={{margin: '2rem 0'}} />
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" onChange={handleChange} placeholder="e.g., Ramesh Kumar" required />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" onChange={handleChange} placeholder="e.g., ramesh@example.com" required />
                </div>
                 <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" name="phone" onChange={handleChange} placeholder="e.g., 9876543210" required />
                </div>
                <div className="form-group">
                    <label>Address</label>
                    <input type="text" name="address" onChange={handleChange} placeholder="e.g., H.No. 123, Rice Mill Road" required />
                </div>
                 <div className="form-group">
                    <label>City</label>
                    <input type="text" name="city" onChange={handleChange} placeholder="e.g., Kakinada" required />
                </div>
                <div className="form-group">
                    <label>State</label>
                    <input type="text" name="state" onChange={handleChange} placeholder="e.g., Andhra Pradesh" required />
                </div>
                 <div className="form-group">
                    <label>ZIP Code</label>
                    <input type="text" name="zip" onChange={handleChange} placeholder="e.g., 533001" required />
                </div>
                <button type="submit" className="btn">Place Order</button>
            </form>
        </div>
    );
};

const OrderHistory = ({ orders, setPage }) => {
    if (orders.length === 0) {
        return (
            <div className="page-container orders-container">
                 <h1 className="page-title">Your Orders</h1>
                <div className="empty-orders">
                    <p>You have not placed any orders yet.</p>
                     <button className="btn" onClick={() => setPage('shop')}>Start Shopping</button>
                </div>
            </div>
        );
    }
    return (
        <div className="page-container orders-container">
            <h1 className="page-title">Your Orders</h1>
            <div className="orders-list">
                {orders.map(order => (
                    <div key={order.id} className="order-card">
                        <div className="order-header">
                            <div><strong>Order ID:</strong> {order.id}</div>
                            <div><strong>Date:</strong> {order.date}</div>
                            <div><strong>Total:</strong> {formatCurrency(order.total)}</div>
                        </div>
                        <div className="order-details">
                            <ul className="order-items-list">
                                {order.items.map(item => (
                                    <li key={item.id}>
                                        <span>{item.quantity} x {item.name}</span>
                                        <span>{formatCurrency(item.priceINR * item.quantity)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="order-total">
                                <strong>Total Paid: {formatCurrency(order.total)}</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- CHATBOT --- //
// FIX: Add explicit prop types to ensure type safety within the component and fix property access errors.
interface ChatbotProps {
    products: typeof PRODUCTS;
    traceabilityData: Record<string, TraceabilityRecord>;
}

const Chatbot = ({ products, traceabilityData }: ChatbotProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: "Hello! I am MKRM's AI assistant. I can help you with product information, order tracking, and more. How can I help you today?", sources: [] }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const systemPrompt = useMemo(() => {
        const productInfo = products.map(p => `- ${p.name}: ${p.priceINR} INR per quintal. Available in units of 1 quintal. Image: ${p.image}.`).join('\n');
        const traceabilityInfo = Object.values(traceabilityData).slice(0, 5).map(t => `- Batch ID ${t.batchId} for ${t.productName} was harvested on ${t.farm.harvestDate} from ${t.farm.name}.`).join('\n');
        return `You are an expert AI assistant for MKRM Rice, a premium rice supplier. Your goal is to be helpful, friendly, and provide accurate information to customers.
        Use the provided context about products and traceability data.
        CONTEXT:
        Products available for sale:
        ${productInfo}

        Sample traceability data:
        ${traceabilityInfo}

        RULES:
        - If a user asks about a product, use the context to provide its price and details.
        - If a user asks to track a batch ID, check if it exists in the sample data. If not, inform them you only have sample data.
        - For general questions about rice, farming, or recipes, use your general knowledge but mention that you are an AI assistant for MKRM Rice.
        - You can answer questions about the company's commitment to quality and sustainability.
        - Be concise. Use markdown for formatting (like lists) if it improves readability.
        - Use Google Search for questions about recent market trends, news, or topics outside the provided context. When you do, you MUST provide the source links.
        - Your name is "MKRM AI Assistant".
        `;
    }, [products, traceabilityData]);

    // FIX: Use process.env.API_KEY to align with the Gemini API coding guidelines and resolve TypeScript errors.
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const sendMessage = async (message) => {
        // FIX: Use process.env.API_KEY to align with the Gemini API coding guidelines and resolve TypeScript errors.
        if (isLoading || !message.trim() || !process.env.API_KEY) return;

        // FIX: Add missing 'sources' property to match the message type in state.
        const userMessage = { role: 'user', text: message, sources: [] };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setIsLoading(true);

        const contents = currentMessages.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        try {
            const stream = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: contents,
                config: {
                    systemInstruction: systemPrompt,
                    tools: [{ googleSearch: {} }],
                },
            });

            let accumulatedText = '';
            let sources = [];
            
            setMessages(prev => [...prev, { role: 'bot', text: '', sources: [] }]);

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                if(chunkText) {
                    accumulatedText += chunkText;
                }
                
                if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                     sources = chunk.candidates[0].groundingMetadata.groundingChunks
                        .map(c => c.web)
                        .filter(Boolean);
                }

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    lastMessage.text = accumulatedText;
                    if (sources.length > 0) lastMessage.sources = sources;
                    return newMessages;
                });
            }

        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I encountered an error. Please try again.', sources:[] }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(inputValue);
        setInputValue('');
    };

    // FIX: Use process.env.API_KEY to align with the Gemini API coding guidelines and resolve TypeScript errors.
    if (!process.env.API_KEY) {
        return null; // Don't render chatbot if no API key
    }

    return (
        <div className="chatbot-container">
            {isOpen && (
                <div className="chat-window" role="dialog" aria-labelledby="chat-header">
                    <div className="chat-header" id="chat-header">
                        <h3>MKRM AI Assistant</h3>
                        <button onClick={() => setIsOpen(false)} aria-label="Close chat">&times;</button>
                    </div>
                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role}-message`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="message-sources">
                                        <strong>Sources:</strong>
                                        <ul>
                                            {msg.sources.slice(0, 3).map((source, i) => (
                                                <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer">{source.title || source.uri}</a></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="typing-indicator" aria-label="Assistant is typing">
                                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chat-input-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a question..."
                            aria-label="Your message"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !inputValue.trim()} aria-label="Send message">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}
            <button className="chatbot-toggle-btn" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Close chat" : "Open chat"}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>
            </button>
        </div>
    );
};


const Footer = ({setPage}) => (
  <footer className="app-footer">
    <div className="footer-content">
        <p><strong>MKRM Rice</strong> is committed to delivering the highest quality rice, sourced responsibly from the finest fields in India. Our advanced traceability system ensures transparency and trust from farm to table.</p>
        <div className="footer-links">
            <a href="#" onClick={(e) => { e.preventDefault(); setPage('shop'); }}>Shop</a>
            <a href="#" onClick={(e) => { e.preventDefault(); alert('About Us page coming soon!'); }}>About Us</a>
            <a href="#" onClick={(e) => { e.preventDefault(); alert('Contact page coming soon!'); }}>Contact</a>
            <a href="#" onClick={(e) => { e.preventDefault(); alert('Privacy Policy page coming soon!'); }}>Privacy Policy</a>
        </div>
    </div>
    <div className="footer-bottom">
      &copy; {new Date().getFullYear()} MKRM Rice Industries. All Rights Reserved.
    </div>
  </footer>
);


const root = createRoot(document.getElementById('root'));
root.render(<App />);