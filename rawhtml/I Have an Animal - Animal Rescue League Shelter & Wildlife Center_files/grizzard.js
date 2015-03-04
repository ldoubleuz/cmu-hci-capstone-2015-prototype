

var guid = (function() {
function s4() {
return Math.floor((1 + Math.random()) * 0x10000)
.toString(16)
.substring(1);
}
return function() {
return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
s4() + '-' + s4() + s4() + s4();
};
})();


//var drw = '<p>bnaksdubd jaysbkybgd $35.00 liashnxi xkauhdhd</p>';


$(document).ready(function(){
	
	var uuid = guid();
	var cnt = 0;
	$('span').each(function (index) {	

	 var amountG = $(this).html();
//console.log($(this).html());
	 var n = amountG.indexOf('$');
	
	 	   if (n != '-1' && cnt==0) {
	 	   	//console.log($(this).html());
	 	   	 var amount = amountG.replace(/[^\d.-]/g, '');
	 	   	 dataLayer.push ({
					'amountGrab': amount,
					'event': 'trackTrans',
					'transactionId': uuid,
					'transactionAffiliation': 'General Donation',
					'transactionTotal': amount,
					'transactionTax': 0,
					'transactionShipping': 0,
					'transactionProducts': [{
					'sku': 'General Donation',
					'name': 'General Donation',
					'category': 'Donation',
					'price': amount,
					'quantity': 1
				}]
			});

	 	   	 	cnt=1;
	 	   }

	});


	//	alert(amount);

});


