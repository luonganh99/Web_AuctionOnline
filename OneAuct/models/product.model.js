const db = require('../utils/db');
const config = require('../config/default.json');

module.exports = {
    all: () =>  db.load('select * from products'),
    page: offset =>  db.load(`select * from products limit ${config.paginate.limit} offset ${offset}`),
    allbyCat: catID => db.load(`select * from products where CatID = ${catID}`),
    pagebyCat: (catID,offset) => db.load(`select * from products where CatID = ${catID} limit ${config.paginate.limit} offset ${offset}`),
    single: async (id) => {
        const rows = await db.load(`select * from products where ProID = ${id}`);
        return rows[0];
    },
    add: entity => db.add('products', entity),
    del: id => db.del('products', {ProID: id}),
    patch: (entity,condition) => {
        // const condition = {ProID: entity.ProID};
        // delete entity.ProID;
        db.patch('products', entity, condition)
    },
    append: (stringAppend,condition) => {
        db.append('products', 'FullInfo', stringAppend , condition)
    },
    count: async () => {
        const rows = await db.load('select count(ProID) as totalProducts from products');
        return rows[0].totalProducts;
    },
    countbyCat: async (catID) => {
        const rows = await db.load(`select count(ProID) as numProducts from products where CatID = ${catID}`);
        return rows[0].numProducts;
    },
    wishlist:  (userID) => db.load(`select p.ProID, p.ProName, p.CurrentPrice, p.State from (select * from wishlist where UserID = ${userID}) w join products p on w.ProID = p.ProID `),
    joininglist: (userID) => db.load(`select * from (select ProID, Price from users_bid_products where UserID = ${userID} and State = 0 order by BidID desc limit 1) b , products p where b.ProID = p.ProID and p.State = 0`),
    joinedlist: (userID) => db.load(`select * from (select ProID, Price from users_bid_products where UserID = ${userID} and State = 0 order by BidID desc limit 1) b , products p where b.ProID = p.ProID and p.State = 1`),
    wonlist: (userID) => db.load(`select uSeller.FullName, p.ProID, p.ProName, p.TinyInfo, p.ExpiryDate, p.CurrentPrice FROM (select ProID, Price from users_bid_products where UserID =  ${userID}  and State = 0 order by BidID desc limit 1) b , products p, users uSeller, users uBidder  where b.ProID = p.ProID and p.SellerID = uSeller.UserID and uBidder.UserID = p.BidderID and p.State = 1 and uBidder.UserID =  ${userID}`),
    reviewlist: (userID) => db.load(`select u.Username as SellerName, r.RateID, r.Grade, r.Message, p.ProName, p.ProID, p.CatID from users_rate_users r, products p, users u where r.Rated_UserID = ${userID} and p.ProID = r.ProID and p.State = 1 and r.UserID = p.SellerID and r.Rated_UserID = p.BidderID and u.UserID = p.SellerID`),
    auctionlist: (userID) => db.load(`select * from products p, users u where p.SellerID = ${userID} and p.BidderID = u.UserID`)
}