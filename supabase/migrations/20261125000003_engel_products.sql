-- שיוך מוצרי אנגל למחלקה החדשה (נוספה במיגרציה הקודמת). עד עכשיו היו 'none'.
update products set department = 'engel' where name like '%אנגל%';
