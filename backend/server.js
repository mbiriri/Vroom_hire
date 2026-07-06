const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'EWill2025$',
  database: 'Vroom'
});

// Endpoint to fetch available vehicles for your React cards
app.get('/api/vehicles', (req, res) => {
  db.query('SELECT * FROM Vehicle WHERE IsAvailable = TRUE', (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.patch('/api/vehicles/:id', (req, res) => {
  const { IsAvailable } = req.body;
  db.query(
    'UPDATE Vehicle SET IsAvailable = ? WHERE Vehicle_id = ?',
    [IsAvailable, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Failed to update vehicle' });
      res.json({ Vehicle_id: req.params.id, IsAvailable });
    }
  );
});

app.get('/api/users', (req, res) => {
  const sql = `
    SELECT Admin_id AS id, Name AS name, Email AS email, 'admin' AS role FROM Admin
    UNION ALL
    SELECT Customer_id AS id, Name AS name, Email AS email, 'customer' AS role FROM Customer
    UNION ALL
    SELECT Driver_id AS id, Name AS name, NULL AS email, 'driver' AS role FROM Delivery_Driver
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post('/api/register/customer', (req, res) => {
  const { name, username, email, phone, license, password } = req.body;

  if (!name || !username || !email || !phone || !license || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const sql='INSERT INTO Customer (Name, Username, Email, PhoneNo, Driving_Licese, Password) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql,[name,username, email, phone,license,password],(err,result)=>{
    if(err){
      if(err.code==='ER_DUP_ENTRY'){
        return res.status(409).json({message:'Username or email already exists.'});
      }
      console.error(err);
      return res.status(500).json({message:'Failed to register customer.'});
    }
    res.status(201).json({message:'Customer registered successfully!', customerId:result.insertId});
  });
});

app.post('/api/customers',(req,res)=>{
    const {name,phone}=req.body;
    const sql = 'INSERT INTO Customer (Name, Password, Age, Email, Driving_Licese, PhoneNo) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql,[name,'temp', 0, 'eobosi14@gmail.com', 'N/A', phone],(err,result)=>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Failed to create customer'});
        }
        res.json({customerId:result.insertId});
    });
});

app.delete('/api/users/:role/:id', (req, res) => {
  const { role, id } = req.params;

  const tableMap = {
    customer: { table: 'Customer', idColumn: 'Customer_id' },
    driver: { table: 'Delivery_Driver', idColumn: 'Driver_id' },
  };

  if (role === 'admin') {
    return res.status(403).json({ message: 'Admins cannot be removed.' });
  }

  const target = tableMap[role];
  if (!target) {
    return res.status(400).json({ message: 'Unknown role.' });
  }

  const sql = `DELETE FROM ${target.table} WHERE ${target.idColumn} = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(409).json({
          message: 'This user has existing bookings and cannot be removed.',
        });
      }
      console.error(err);
      return res.status(500).json({ message: 'Failed to remove user.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'User removed.' });
  });
});

// Customer hire history: vehicle, date taken, date returned
app.get('/api/customers/:id/hires', (req, res) => {
  const sql = `
    SELECT v.Vehicle_Name AS vehicle_name, p.Dates_Taken AS hire_date, p.Date_Returned AS return_date
    FROM Booking b
    JOIN Vehicle v ON b.Vehicle_id = v.Vehicle_id
    LEFT JOIN Payment p ON p.Booking_id = b.Booking_id
    WHERE b.Customer_id = ?
    ORDER BY p.Dates_Taken DESC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Endpoint to process a booking from the React Drawer
app.post('/api/bookings', (req, res) => {
  const { destination, price, customer_id, vehicle_id } = req.body;
  const sql = `INSERT INTO Booking (Destination, Transaction_Price, Customer_id, Vehicle_id) VALUES (?, ?, ?, ?)`;
  
  db.query(sql, [destination, price, customer_id, vehicle_id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Booking saved successfully!", bookingId: result.insertId });
  });
});

app.listen(5000, () => console.log('Server running on port 5000'));

db.connect((err)=>{
    if(err){
        console.error('Connection to the database failed:',err.message);
        return;
    }
    console.log('Successful connection to database!');
});