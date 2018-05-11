$(function(){
	var index =$('#index');
	var listings = {};

	var processListing = function(){

	}

	var showListing = function(){
		index.slideDown();
	}

	var showForm = function(dir){
		var fields = [
			'dir',
			'name',
			'scan-name',
			'description',
			'email',
			'phone',
			'twitter'
		];
		var entry = listings[dir];
		console.log(entry);
		fields.forEach(function(field){
			$('#personalinfo *[name='+field+']').val( entry[field] || "" );
		});
		index.slideUp();
	}

	var getListing = function(){
		var request = $.ajax('/list');
		request.done(onListingResponse);
		request.fail(function(){
		});
	}

	var onListingResponse = function(data,status){
		//console.log(data);
		var keys = Object.keys(data);
		if( keys.length === Object.keys(listings).length ){
			return;
		}
		listings = {};
		var listingContainer = $('#index .container');
		listingContainer.empty();
		keys.forEach(function(k){
			data[k]['dir'] = k;

			listingContainer.append(makeListingEntry(data[k]));
			listings[k] = data[k];
		});
		$('#index .container button').click(function(button){
			var dir = $(this).attr('data-dir');
			showForm(dir);
		});
	}

	var makeListingEntry = function(entry){
		var o = [];
		o.push('<span class="dir">'+entry.dir+'</span>');
		o.push('<span class="scan-name">'+(entry['scan-name']||"incomplete")+'</span>')
		o.push('<span class="edit"><button class="edit-button" data-dir="'+entry.dir+'"">edit</button</span>');
		return '<div class="index-entry" data-dir="'+entry.dir+'">'+o.join('')+'</div>';
	}

	var updateListingEntry = function(entry){
		if( !entry.dir ) return;
		var element = $('#index .index-entry[data-dir='+entry.dir+']');
		Object.keys(entry).forEach(function(key){
			$('.'+key,element).html(entry[key]||"incomplete");
		});
	}

	var onFormChange = function(){
	};

	var onFormSubmit = function(){
		return false;
	};

	var onSaveClicked = function(element){
		console.log('submit clicked');
		var saveButton = $(this);
		saveButton.attr('disabled','');
		var data = {};
		console.log($("#personalinfo").serializeArray());
		$("form").serializeArray().forEach(function(x){data[x.name] = x.value;});
		listings[data['dir']] = data;
		console.log(data);
		$.ajax("/",{
			method:"POST",
			contentType: 'application/json',
			data:JSON.stringify(data),
			dataType:'json',
			success: function(){
				saveButton.attr('disabled',false);
				updateListingEntry(data);
				showListing();

			},
			error: function(e){
				console.error(e);
			}
		});
	};

	$('html').keyup(function(e){
		/*
		if( e.keyCode === 40 ){
			showListing();
		}
		*/
		/*
		if( e.keyCode == 38 ){
			hideListing();
		}
		*/
		
	});

	var activateFullscreen = function(){
		var el = document.documentElement;
    	var fs =
	           el.requestFullScreen
	        || el.webkitRequestFullScreen
	        || el.mozRequestFullScreen;
    	fs.call(el);
	}

	$('form#personalinfo input').on('keyup',onFormChange);
	$('form#personalinfo input').change(onFormChange);
	$('form#personalinfo').on('submit',onFormSubmit);
	$('#savebutton').on('click',onSaveClicked)
	$('input').attr('autofill', 'off');
	$('form').attr('autocomplete', 'off');
	
	/*
	$(document.documentElement).click(function(){
		console.log('click!');
		activateFullscreen();
	});
	*/
	$('#reald-button').on('click',function(event){
		event.preventDefault();
		$('#reald-privacy-policy').slideDown();
	});

	$('#vue-button').on('click',function(event){
		event.preventDefault();
		$('#vue-privacy-policy').slideDown();
	});

	$('.reald-close').on('click',function(){
		$('#reald-privacy-policy').slideUp();
	});

	$('.vue-close').on('click',function(){
		$('#vue-privacy-policy').slideUp();
	});


	getListing();
	setInterval(getListing,5000);
});