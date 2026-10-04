<?php
// Taliyo Technologies - PHP & SQLite Demo Store
error_reporting(E_ALL);
ini_set('display_errors', 1);

// SQLite Database Setup
$dbPath = __DIR__ . '/database.sqlite';
$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Create table if not exists
$pdo->exec("CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)");

// Insert default products if empty
$count = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
if ($count == 0) {
    $stmt = $pdo->prepare("INSERT INTO products (name, price, category) VALUES (?, ?, ?)");
    $stmt->execute(['Taliyo Diamond Ring', 499.00, 'Jewelry']);
    $stmt->execute(['Taliyo Gold Necklace', 899.50, 'Jewelry']);
    $stmt->execute(['Taliyo Luxury Watch', 1250.00, 'Watches']);
    $stmt->execute(['Taliyo Silver Bracelet', 250.00, 'Accessories']);
}

// Handle product submission
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['name'])) {
    $name = trim($_POST['name']);
    $price = floatval($_POST['price']);
    $category = trim($_POST['category']);
    if ($name && $price > 0) {
        $stmt = $pdo->prepare("INSERT INTO products (name, price, category) VALUES (?, ?, ?)");
        $stmt->execute([$name, $price, $category]);
        $message = "Product added successfully to SQLite database!";
    }
}

// Fetch all products
$products = $pdo->query("SELECT * FROM products ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);

// Check Redis connectivity
$redisStatus = "Not Connected (Optional)";
$redisHost = getenv('REDIS_HOST') ?: '127.0.0.1';
$redisPort = getenv('REDIS_PORT') ?: 6379;
$redisSocket = @fsockopen($redisHost, (int)$redisPort, $errno, $errstr, 0.5);
if ($redisSocket) {
    fclose($redisSocket);
    $redisStatus = "Connected to Redis at {$redisHost}:{$redisPort}";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP + SQLite Live Demo | Taliyo Marketplace</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #090a10;
            --surface: #11131f;
            --card: #161928;
            --accent: #6366f1;
            --php: #818cf8;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
            --success: #10b981;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: var(--bg); color: var(--text); padding: 40px 20px; min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .badge { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .status-pill { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 12px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 30px; }
        .info-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
        .info-card h4 { font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; letter-spacing: 0.5px; }
        .info-card p { font-size: 15px; font-weight: 600; }
        .main-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 26px; margin-bottom: 30px; }
        h3 { margin-bottom: 16px; font-size: 18px; }
        .form-row { display: grid; grid-template-columns: 2fr 1fr 1.5fr auto; gap: 12px; margin-bottom: 16px; }
        input, select { background: var(--card); border: 1px solid var(--border); color: white; padding: 10px 14px; border-radius: 8px; font-size: 14px; }
        input:focus, select:focus { outline: none; border-color: var(--accent); }
        button { background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        button:hover { background: #4f46e5; }
        .alert { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { text-align: left; padding: 12px; font-size: 12px; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border); }
        td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 14px; }
        tr:hover td { background: rgba(255, 255, 255, 0.02); }
        .price { font-weight: 700; color: #34d399; }
    </style>
    <script src="advanced-protection.js"></script>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="brand">
                <span class="badge">🐘 PHP <?= PHP_VERSION ?></span>
                <h2>Taliyo Demo Store</h2>
            </div>
            <span class="status-pill">● Full-Stack Active</span>
        </header>

        <div class="info-grid">
            <div class="info-card">
                <h4>Runtime Engine</h4>
                <p>PHP CLI Built-In Server</p>
            </div>
            <div class="info-card">
                <h4>Database Engine</h4>
                <p>SQLite (PDO Zero-Config)</p>
            </div>
            <div class="info-card">
                <h4>Redis Status</h4>
                <p style="font-size: 13px;"><?= htmlspecialchars($redisStatus) ?></p>
            </div>
        </div>

        <?php if ($message): ?>
            <div class="alert"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <div class="main-card">
            <h3>Add New Product</h3>
            <form method="POST">
                <div class="form-row">
                    <input type="text" name="name" placeholder="Product Name" required>
                    <input type="number" step="0.01" name="price" placeholder="Price ($)" required>
                    <select name="category">
                        <option value="Jewelry">Jewelry</option>
                        <option value="Watches">Watches</option>
                        <option value="Accessories">Accessories</option>
                    </select>
                    <button type="submit">+ Add</button>
                </div>
            </form>
        </div>

        <div class="main-card">
            <h3>Products in Database (<?= count($products) ?>)</h3>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Added Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($products as $p): ?>
                        <tr>
                            <td>#<?= $p['id'] ?></td>
                            <td><strong><?= htmlspecialchars($p['name']) ?></strong></td>
                            <td><?= htmlspecialchars($p['category']) ?></td>
                            <td class="price">$<?= number_format($p['price'], 2) ?></td>
                            <td style="color:var(--text-muted); font-size:12px;"><?= $p['created_at'] ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
