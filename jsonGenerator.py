import json


dummydict = {
    'sections': [
        {   
            'title': 'Behavior with Others',
            'fields': [
                {
                    'title': 'Vet', 
                    'value': 'friendly'
                },
                {
                    'title': 'Cats', 
                    'value': 'friendly'
                },
                {
                    'title': 'Children', 
                    'value': 'friendly'
                },
                {
                    'title': 'Other dogs', 
                    'value': 'friendly'
                }
            ]
        },
        {
            'title': 'Training information',
            'fields': [
                {
                    'title': 'Crate trained', 
                    'value': 'Yes'
                },
                {
                    'title': 'House trained', 
                    'value': 'Yes'
                },
                {
                    'title': 'How pet indicates desire to go outside', 
                    'value': 'Sits close to me'
                },
                {
                    'title': 'Where pet goes to bathroom', 
                    'value': 'Outdoors'
                },
                {
                    'title': 'Training classes', 
                    'value': 'No'
                },
                {
                    'title': 'Walked on leash', 
                    'value': 'Yes'
                },
                {
                    'title': 'Commands', 
                    'value': 'Sit, stay, down'
                },
            ]
        },
        {
            'title': "Dog's Preferences",
            'fields': [
                {
                    'title': 'Favorite toy',
                    'value': 'Ball, frisbee, squeaky toy'
                }
            ]
        }
    ]
}

with open('interview-dummy.json', 'w') as file:
    file.write(json.dumps(dummydict))