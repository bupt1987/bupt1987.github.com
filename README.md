一、为什么要做这件事  
二、什么是json-schema，为什么用它  
三、如何使用json-schema  
四、如何用json-schema来适应我们多变的验证  
五、现在完成的编辑工具  
六、将来要做成什么样  


一、为什么要做这件事  
1.pm可能会将配置文件配错，而且从肉眼很难检查出来：  

	a.卖出价格大于买入价格  
	b.配置数组时把括号括到了错误的地方  
	c.一个有序数组删掉了中间一项，变成了一个hash数组导致游戏出错  
	d.配置的关联性，改了一个地方，忘了改另外一个地方  
2.随着配置文件的增加，pm和技术都可能不知道这个配置是干什么的，需要看代码才能回忆  
3.现有的验证，没有一个验证的规范，并且配置文件越来越大，打开配置文件编辑都是件很卡的事情  
4.没有直观性，用google的excel来展示一个树状的配置文件，怎么看都比较恶心  

所以，我们的目标是：需要用一种编辑器，可以提示编辑者每个参数是干什么的，需要符合那些规范，配置错误会自动指出哪里错了，同时外观上还比较美观、直观，修改添加很方便  

二、什么是json-schema，为什么用它  
1.一种jsong数据格式的说明，http://json-schema.org/  
2.方便的验证数据  

	a.验证object的属性  
	b.验证数组内的数据，数组大小验证  
	c.枚举的限制  
	d.int，number等验证  
3.学习成本低，看几个例子基本就懂了 http://json-schema.org/examples.html  
4.有现有开源的js和php库，可以方便的根据自己的需求进行修改  

	https://github.com/jdorn/json-editor => 提取了js的json验证部分  
	https://github.com/josdejong/jsoneditor	=> json的编辑工具  
	https://github.com/justinrainbow/json-schema => php的json验证  

三、如何使用json-schema  
1.数据类型,https://github.com/justinrainbow/json-schema/blob/master/src/JsonSchema/Constraints/Type.php 通过代码可以看出  


	static $wording = array(  
		'integer' => 'an integer',  
		'number'  => 'a number',  
		'boolean' => 'a boolean',  
		'object'  => 'an object',  
		'array'   => 'an array',  
		'string'  => 'a string',  
		'null'    => 'a null',  
		'any'     => NULL, // validation of 'any' is always true so is not needed in message wording  
		0         => NULL, // validation of a false-y value is always true, so not needed as well  
    	);  


2.各个类型如何表达，主要讲array和object  

	a.object 表达式  
	
	{
		"title": "Example Schema",
		"type": "object",
		"properties": {
			"firstName": {
				"type": "string"
			},
			"lastName": {
				"type": "string"
			},
			"age": {
				"description": "Age in years",
				"type": "integer",
				"minimum": 0
			}
		},
		"patternProperties": {
			"^[a-zA-Z]+$": {
				"类似于properties"
			}
		},
		"additionalProperties": false, //不能有而外的属性
		"required": ["firstName", "lastName"] //必须有firstName 和 lastName
	}
	
	b.array 表达式
	
	{
            "type": "array",
            "items": {
                "type": "string" //一个string数组
            },
            "minItems": 1, //至少有1个
            "uniqueItems": true //不能有重复的
    }
    
	其中items还可以是一个数组，表示可以有多种类型的元素
	
	"items": [
		{
			"type": "string"
		},
		{
			"type": "object"
		},
	]

3.引用$ref，实现一个属性只用写一次的关键，例如：奖励  

	看例子说明：http://json-schema.org/example2.html  
	
4.其他参数：枚举enum，maximum，minimum，minLength，maxLength 等等   

四、如何用json-schema来适应我们多变的验证  
1.现有的需求  

	a.验证奖励，奖励的物品必须在allItems里面配置了  
	b.卖出价格必须小于买入价格  
	c.配置物品关联任务时，验证是否是一个任务  
	
2.加入特殊参数$function_valid 加入一个函数，来应对不同的需求  

	a.脚步例子
	// schema
	$data = json_decode(json_encode($data));
	$retriever = new JsonSchema\Uri\UriRetriever;
	$schema = $retriever->retrieve('file://' . __DIR__ . '/schema/' . $sJson . '.json');
	$refResolver = new JsonSchema\RefResolver($retriever);
	//在扫描$ref时同时扫描$function_valid 
	$refResolver->resolve($schema, 'file://' . __DIR__ . '/schema/' . $sJson . '/', __DIR__ . '/function/');

	// Validate
	$validator = new JsonSchema\Validator();
	$validator->check($data, $schema);

	if ($validator->isValid()) {
		echo "OK\n";
	} else {
		$bError = true;
		echo "\n======================================== ERROR =======================================\n\n";
		foreach ($validator->getErrors() as $error) {
			echo sprintf("[%s] %s\n", $error['property'], $error['message']);
		}
		echo "\n======================================== ERROR =======================================\n\n";
	}
	
	b.方法resolve
	
	public function resolve($schema, $sourceUri = null, $functionDir = null) {
		.....

		// Resolve $ref first
		$this->resolveRef($schema, $sourceUri, $functionDir);

		// Resolve $function_valid (Royal Story)
		$this->resolveFunctionValid($schema, $functionDir);

		.....
    	}
	
	c.方法resolveFunctionValid
	
	private function resolveFunctionValid($schema, $functionDir){
		if($this->notIncludeFunction) {
		    return;
		}
		$function = '$function_valid';

		if (empty($schema->$function)) {
			return;
		}
		if(is_string($schema->$function)) {
			$schema->$function = $this->fetchFunctionValid($schema->$function, $functionDir);
		}elseif(is_array($schema->$function)) {
			$lFunction = [];
			foreach($schema->$function as $sFunction) {
				$lFunction[] = $this->fetchFunctionValid($sFunction, $functionDir);
			}
			$schema->$function = $lFunction;
		}
	}
	

	d.方法fetchFunctionValid
	
	private function fetchFunctionValid($function, $functionDir)
	{
		if(!isset($this->lFunction[$function])) {
			$oFunction = include rtrim($functionDir, '/') . '/' . $function . '.php';
			$this->lFunction[$function] = $oFunction;
		}
		return $this->lFunction[$function];
	}

	e.验证过程中加入验证 
	
	public function check($value, $schema = null, $path = null, $i = null){
		if (is_null($schema)) {
		    return;
		}

		if (!is_object($schema)) {
		    throw new InvalidArgumentException(
		        'Given schema must be an object in ' . $path
		        . ' but is a ' . gettype($schema)
		    );
		}

		$i = is_null($i) ? "" : $i;
		$path = $this->incrementPath($path, $i);

		// check function (Royal Story)
		$this->validateFunction($value, $schema, $path, $i);

		// check special properties
		$this->validateCommonProperties($value, $schema, $path);

		// check allOf, anyOf, and oneOf properties
		$this->validateOfProperties($value, $schema, $path);

		// check known types
		$this->validateTypes($value, $schema, $path, $i);
    }

	f.function例子,验证item的ident
	
	return function ($value) {

		if($value === '') {
			return true;
		}

		$lIdent = Validate::getIdentList();

		if(strpos($value, ',') !== false){
			$value = explode(',', $value);
		}

		if(is_array($value)) {
			foreach($value as $sVal) {
				if(!isset($lIdent[$sVal])) {
					return $value . ' is not in allItems.php';
				}
			}
		}else{
			if(!isset($lIdent[$value])) {
				return $value . ' is not in allItems.php';
			}
		}
		return true;
	};


3.将来想改进的方向，把函数写成js的，这样前端可以执行，不用php写一遍，再用js写一遍  

	php执行js http://php.net/manual/en/v8js.examples.php  

五、现在完成的编辑工具 （http://192.168.22.17/validate/index.html）  

	基于3个开源库  
	https://github.com/jdorn/json-editor => 提取了js的json验证部分  
	https://github.com/josdejong/jsoneditor	=> json的编辑工具  
	https://github.com/justinrainbow/json-schema => php的json验证  
	
	现在完成的功能
	a.配置文件中单项的增删改查  
	b.描述展示  
	c.实时验证  
	d.后端验证

六、将来要做成什么样  
1.所有的配置的属性不用手动填写，变成下拉框  
2.所有物品列表、任务列表，不用手动填写，可以自动完成  
3.属性的关联，增加了一个属性，然后和这个属性关联的其他属性如果没有也新增  
4.验证$function_valid 可以在前端js执行  
