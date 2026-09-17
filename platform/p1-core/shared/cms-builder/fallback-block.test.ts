import {it,expect} from 'vitest';
import {createFallbackBlockDef} from './fallback-block';
it('infers retained compatibility controls without replacing unsupported nested data',()=>{
 const values={title:'Old title',enabled:true,count:2,imageUrl:'/image.png',link:'/contact',body:'<p>Saved content</p>',nested:{unknown:true},rows:[{value:1}],nothing:null};
 const definition=createFallbackBlockDef('older-block',values);
 expect(definition.label).toBe('Older Block (Compatibility Mode)');
 expect(Object.fromEntries(definition.propDefs.map(field=>[field.key,field.type]))).toEqual({title:'text',enabled:'boolean',count:'number',imageUrl:'image-url',link:'url',body:'textarea'});
 expect(definition.defaultProps).toBe(values);expect(values.nested).toEqual({unknown:true});expect(values.rows).toEqual([{value:1}]);
});
