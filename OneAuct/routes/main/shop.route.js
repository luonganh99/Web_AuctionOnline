const express = require('express');
const productModel = require('../../models/product.model');
const categoryModel = require('../../models/category.model');
const userModel = require('../../models/user.model');
const bidModel = require('../../models/user-bid-product.model');
const wishModel = require('../../models/wishlist.model');
const rateModel = require('../../models/user-rate-user.model');
const config = require('../../config/default.json');
const moment = require('moment');
const router = express.Router();
const restrictUser = require('../../middlewares/authUser.mdw');
const limit = config.paginate.limit;

router.get('/', async(req,res) => {
    const orderBy = +req.query.orderBy || 0;
    //Tao offset tu page request
    const page = req.query.page || 1;
    if(page < 1) page = 1;
    const offset = (page - 1) * limit;

    let nameOrder;
    let order;
    if(orderBy === 0) {
        order = 'ExpiryDate'
        nameOrder = "Thời gian giảm dần";
    } else {
        order = 'CurrentPrice'
        nameOrder = "Giá tăng dần";
    }
    //Lay du lieu database
    const [totalProducts, products] = await Promise.all([
        productModel.count(),
        productModel.page(offset,order),
    ]);


    //Tong so trang 
    let nPages = Math.floor(totalProducts/limit);
    if(totalProducts % limit > 0) nPages++; 
    
    //Mang page de hien thi view
    const page_numbers = [];
    for(i = 1; i <= nPages; i++){
        page_numbers.push({
            value: i,
            isCurrent: i === +page 
        })
    }

    //Tao nut bam
    let prev_value = +page - 1;
    let next_value = +page + 1;
    if(prev_value < 1) prev_value = 1;
    if(next_value > nPages) next_value = nPages;

    res.render('main/shop/all', {
        products,
        totalProducts,
        page_numbers,
        prev_value,
        next_value,
        nameCategory: 'Tất Cả Danh Mục',
        empty: products.length === 0,
        nameOrder,
        orderBy
    });
});

router.get('/:catID/products', async (req,res) => {
    const orderBy = +req.query.orderBy || 0;
    // let numProducts;
    // for(const c of res.locals.lcCategories){
    //     if(c.CatID === +catID) {
    //         numProducts = c.num_of_products;
    //     }
    // }

    const catID = req.params.catID;
    //Tao offset tu page request
    const page = req.query.page || 1;
    if(page < 1) page = 1;
    const offset = (page - 1) * limit;

    let nameOrder;
    let order;
    if(orderBy === 0) {
        order = 'ExpiryDate'
        nameOrder = "Thời gian giảm dần";
    } else {
        order = 'CurrentPrice'
        nameOrder = "Giá tăng dần";
    }

    //Lay du lieu tu database
    const [totalProducts,products,categories] = await Promise.all([
        productModel.countbyCat(catID),
        productModel.pagebyCat(catID,offset,order),
        categoryModel.single(catID)
    ]);
    //Tong so trang
    let nPages = Math.floor(totalProducts/limit);
    if(totalProducts%limit > 0) nPages++;

    //Mang page de hient hien thi view
    const page_numbers = [];
    for(i = 1; i <= nPages; i++){
        page_numbers.push({
            value: i,
            isCurrent: i === +page
        })
    }

    //Tao nut bam
    let prev_value = +page - 1;
    let next_value = +page + 1;
    if(prev_value < 1) prev_value = 1;
    if(next_value > nPages) next_value = nPages;
    res.render('main/shop/all', {
        products,
        totalProducts,
        page_numbers,
        prev_value,
        next_value,
        nameCategory: categories.CatName,
        empty: products.length === 0,
        nameOrder,
        orderBy
    });
});

router.post('/:catID/products/:proID/wishlist', restrictUser, async (req,res) => {
    const proID = req.params.proID;
    const entity = {
        proID,
        Username: req.session.authUser.Username,
        UserID: req.session.authUser.UserID
    };
    const isExists = await wishModel.isExists(entity.UserID,entity.proID,);
    if(isExists.length === 0) {
        const results = await wishModel.add(entity);
    }
    return res.redirect('/user/wishlist');
});

router.get('/:catID/products/:proID', async (req,res) => {
    const proID = req.params.proID;
    const catID = req.params.catID;
  
    const [product, category, seller, bidder, bidbyPro] = await Promise.all([
        productModel.single(proID),
        categoryModel.single(catID),
        userModel.seller(proID),
        userModel.bidder(proID),
        bidModel.bidbyPro(proID),
    ])
    let i = 1;
    for(c of bidbyPro){
        c.Index = i++;
    }
    const [goodRate,badRate] = await Promise.all([
        rateModel.goodReview(seller.UserID),
        rateModel.badReview(seller.UserID),
    ])


    //Xu ly cua view 
    // let startDate = moment(product.StartDate);
    // let expiryDate = moment(product.ExpiryDate);
    // const diffDate = expiryDate.diff(startDate,'days');

    // product.StartDate = startDate.format("DD-MM-YYYY");
    // if(diffDate < 3) 
    // {
    //     product.ExpiryDate = startDate.to(expiryDate);
    // } else {
    //     product.ExpiryDate = expiryDate.format("DD-MM-YYYY");
    // }
    //Kiểm tra trang sản phẩm có phải mình là người đăng đấu giá hay không
    let isOwn = false;
    if(req.session.isAuthenticated){
        if(req.session.authUser.Permission === 1 && req.session.authUser.UserID === seller.UserID) {
            isOwn = true;
        } 
    }
    
    res.render('main/shop/productsDetail', {
        product,
        category,
        seller,
        bidder,
        bidbyPro,
        isBid: false,
        isOwn,
        goodRate,
        badRate
    });
   
});

router.post('/:catID/products/:proID/update', async (req,res) => {
    const condition = {
        ProID: req.params.proID
    }
    const results = await productModel.append(req.body.AppendFullInfo,condition);
    res.redirect(`/shop/${req.params.catID}/products/${req.params.proID}`);
});

router.get('/:catID/products/:proID/check', restrictUser, async (req,res) => {
    const catID = req.params.catID;
    const proID = req.params.proID;

    const [product, category, seller, bidder, bidbyPro, isBan] = await Promise.all([
        productModel.single(proID),
        categoryModel.single(catID),
        userModel.seller(proID),
        userModel.bidder(proID),
        bidModel.bidbyPro(proID),
        bidModel.isBan(req.session.authUser.UserID,proID)
    ])

    const userID = req.session.authUser.UserID;
    //Kiểm tra người dùng có hợp lệ
    const [goodRate,badRate] = await Promise.all([
        rateModel.goodReview(userID), 
        rateModel.badReview(userID)
    ]);

    const checkRate = goodRate / (goodRate + badRate);
    if(checkRate < 0.8){
       return res.render('main/shop/productsDetail', {
            product,
            category,
            seller,
            bidder,
            bidbyPro,
            isBid: false,
            err_message: 'Bạn không đủ quyền để đấu giá'
       });
    }
    //Kiểm tra người dùng có bị chặn bởi người bán
 
    if(isBan.num_ban !== 0){
        return res.render('main/shop/productsDetail', {
            product,
            category,
            seller,
            bidder,
            bidbyPro,
            isBid: false,
            err_message: 'Bạn đã bị chặn bởi người bán'
       });
    }

    res.render('main/shop/productsDetail', {
        product,
        category,
        seller,
        bidder,
        bidbyPro,
        isBid: true,
    });

});

router.post('/:catID/products/:proID/ban/:userID', restrictUser, async (req,res) => {
   const entity = {
       State: 1
   }
   const condition_1 = {
       UserID: +req.params.userID,
   }
   const condition_2 = {
        ProID: +req.params.proID,
   }
   const results = bidModel.patch_2(entity,condition_1,condition_2);

    res.redirect(`/shop/${req.params.catID}/products/${req.params.proID}`);
});

// Đấu giá tự động
router.post('/:catID/products/:proID/check/auto',restrictUser, async (req,res) => {
    const catID = req.params.catID;
    const proID = req.params.proID;
});

// Đấu giá trực tiếp
router.post('/:catID/products/:proID/check/direct',restrictUser, async (req,res) => {
    const entity = {
        ProID: req.params.proID,
        UserID: req.session.authUser.UserID,
        Username: req.session.authUser.Username,
        BidTime: moment().format('YYYY-MM-DD , HH:mm:ss'),
        Price :req.body.Price,
    }
    console.log(entity);
    const results = await bidModel.add(entity);
    res.redirect('/user/joininglist');

});

module.exports = router;